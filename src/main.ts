import { Store, TypeormDatabase } from "@subsquid/typeorm-store";
import {
  ExchangeIn,
  DailyExchangeIn,
  MonthlyExchangeIn,
  DailyExchangeOut,
  MonthlyExchangeOut,
  CumulativeExchange,
  ExchangeOut,
  Holder,
  HolderType,
} from "./model";
import { processor } from "./processor";
import { wallets } from "./wallets";
import * as sqdAbi from "./abi/sqd";
import { SQD_CONTRACT, Log, Block } from "./processor";
import { trimDateDay, trimDateMonth } from "./utils";
import { BlockData, DataHandlerContext } from "@subsquid/evm-processor";
import { get } from "http";
import { In } from "typeorm";

const DECIMALS = 18;
enum RecordType {
  DAILY,
  MONTHLY,
}

type Transfer = ExchangeIn | ExchangeOut;
type DatedRecord =
  | DailyExchangeIn
  | MonthlyExchangeIn
  | DailyExchangeOut
  | MonthlyExchangeOut;

type HolderOp = {
  addr: string;
  value: bigint;
  isNegative: boolean;
};

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
  let cumulative = await createOrGetCumulativeRecord(ctx);
  let holders = new Map<string, Holder>();
  let dailyIns = new Map<string, DatedRecord>();
  let dailyOuts = new Map<string, DatedRecord>();
  let monthlyIns = new Map<string, DatedRecord>();
  let monthlyOuts = new Map<string, DatedRecord>();
  let holderOps: HolderOp[] = [];
  let exchangeIns = [];
  let exchangeOuts = [];
  for (let c of ctx.blocks) {
    for (let log of c.logs) {
      let { from, to, value } = sqdAbi.events.Transfer.decode(log);
      //exchange In
      if (log.address == SQD_CONTRACT && wallets.has(to)) {
        let exchangeIn = new ExchangeIn(processTransfer(log, c));
        exchangeIns.push(exchangeIn);
      }
      //exchange Out
      if (log.address == SQD_CONTRACT && wallets.has(from)) {
        let exchangeOut = new ExchangeOut(processTransfer(log, c));
        exchangeOuts.push(exchangeOut);
      }

      //get all ops and resolve in the end
      let h1: HolderOp = { addr: from, value, isNegative: true };
      let h2: HolderOp = { addr: to, value, isNegative: false };
      holderOps.push(h1);
      holderOps.push(h2);
      //more txs
      //holders = await updateHoldersMap(ctx, holders, from, to, value);
    }
    //total amountIn for these logs
    const totalAmountIn = exchangeIns.reduce(
      (sum, exchangeIn) => sum + exchangeIn.amount,
      0
    );

    //total amountOut for these logs

    const totalAmountOut = exchangeOuts.reduce(
      (sum, exchangeOut) => sum + exchangeOut.amount,
      0
    );
  }
  //resolve dailyIns
  dailyIns = await resolveDailyIns(exchangeIns, dailyIns, ctx);
  //resolve dailyOuts
  dailyOuts = await resolveDailyOuts(exchangeOuts, dailyOuts, ctx);
  //resolve monthlyIns
  monthlyIns = await resolveMonthlyIns(dailyIns, monthlyIns, ctx);
  //resolve monthlyOuts
  monthlyOuts = await resolveMonthlyOuts(dailyOuts, monthlyOuts, ctx);

  await ctx.store.upsert(exchangeIns);
  await ctx.store.upsert(exchangeOuts);
  await ctx.store.upsert(cumulative);
  await ctx.store.upsert([...dailyIns.values()]);
  await ctx.store.upsert([...dailyOuts.values()]);
  await ctx.store.upsert([...monthlyIns.values()]);
  await ctx.store.upsert([...monthlyOuts.values()]);

  //resolve holders
  holders = await resolveHolders(holderOps, ctx, holders);
  //remove holders with zero balances
  let zeroBalances = Array.from(holders.values()).filter(
    (holder) => holder.balance <= 0
  );
  //update holders with positive balances
  let positiveBalances = Array.from(holders.values()).filter(
    (holder) => holder.balance > 0
  );
  await ctx.store.upsert([...positiveBalances.values()]);
  await ctx.store.remove([...zeroBalances.values()]);
});

function processTransfer(log: Log, c: BlockData): Transfer {
  let { from, to, value } = sqdAbi.events.Transfer.decode(log);
  let amountNum = Number(value / BigInt(10 ** DECIMALS));
  let transfer: Transfer = {
    id: log.id,
    from,
    to,
    block: BigInt(c.header.height),
    amount: amountNum,
    hash: log.transactionHash,
    date: new Date(c.header.timestamp),
  };
  return transfer;
}

async function createOrGetCumulativeRecord(ctx: DataHandlerContext<Store>) {
  let cumulativeRecord = await ctx.store.findOne(CumulativeExchange, {
    where: { id: "cumulative" },
  });
  if (!cumulativeRecord) {
    return new CumulativeExchange({
      id: "cumulative",
      totalAmountIn: 0,
      totalAmountOut: 0,
    });
  }
  return cumulativeRecord;
}

function getHolderType(balance: number): HolderType {
  if (balance > 500000) {
    return HolderType.WHALE;
  }
  if (balance >= 10000) {
    return HolderType.DOLPHIN;
  }
  if (balance >= 100) {
    return HolderType.GOLDFISH;
  }
  return HolderType.SHRIMP;
}

async function findHoldersByAddresses(
  ctx: DataHandlerContext<Store>,
  addresses: string[]
): Promise<Map<string, Holder>> {
  return await ctx.store
    .find(Holder, {
      where: {
        address: In(addresses),
      },
    })
    .then(
      (holders) => new Map(holders.map((holder) => [holder.address, holder])) // Change the type of 'holders' to 'Holder[]'
    );
}

async function resolveHolders(
  holderOps: HolderOp[],
  ctx: DataHandlerContext<Store>,
  holders: Map<string, Holder>
): Promise<Map<string, Holder>> {
  let holderAddresses = holderOps.map((holderOp) => holderOp.addr);
  let existingHolders = await findHoldersByAddresses(ctx, holderAddresses); //map with existing holders

  for (let holderOp of holderOps) {
    let holder = existingHolders.get(holderOp.addr);
    if (!holder) {
      holder = new Holder({
        id: holderOp.addr,
        address: holderOp.addr,
        balance: 0,
        type: HolderType.SHRIMP,
      });
    }
    let num = Number(holderOp.value / BigInt(10 ** DECIMALS));
    holder.balance += holderOp.isNegative ? -num : num;
    holder.type = getHolderType(holder.balance);
    holders.set(holder.address, holder);
  }
  return holders;
}

async function resolveDailyIns(
  exchangeIns: ExchangeIn[],
  dailyIns: Map<string, DatedRecord>,
  ctx: DataHandlerContext<Store>
) {
  let dates = exchangeIns.map((exchangeIn) => trimDateDay(exchangeIn.date));
  let existingDailyIns = await ctx.store
    .find(DailyExchangeIn, {
      where: {
        date: In(dates),
      },
    })
    .then(
      (dailyIns) => new Map(dailyIns.map((dailyIn) => [dailyIn.date, dailyIn])) // Change the type of 'dailyIns' to 'DailyExchangeIn[]'
    );
  for (let exchange of exchangeIns) {
    let dailyIn = existingDailyIns.get(trimDateDay(exchange.date));
    if (!dailyIn) {
      dailyIn = new DailyExchangeIn({
        id: trimDateDay(exchange.date),
        date: trimDateDay(exchange.date),
        totalAmount: 0,
      });
    }
    dailyIn.totalAmount += exchange.amount;
    dailyIns.set(dailyIn.date, dailyIn);
  }
  return dailyIns;
}

async function resolveDailyOuts(
  exchangeOuts: ExchangeOut[],
  dailyOuts: Map<string, DatedRecord>,
  ctx: DataHandlerContext<Store>
) {
  let dates = exchangeOuts.map((exchangeOut) => trimDateDay(exchangeOut.date));
  let existingDailyOuts = await ctx.store
    .find(DailyExchangeOut, {
      where: {
        date: In(dates),
      },
    })
    .then(
      (dailyOuts) =>
        new Map(dailyOuts.map((dailyOut) => [dailyOut.date, dailyOut])) // Change the type of 'dailyOuts' to 'DailyExchangeOut[]'
    );
  for (let exchange of exchangeOuts) {
    let dailyOut = existingDailyOuts.get(trimDateDay(exchange.date));
    if (!dailyOut) {
      dailyOut = new DailyExchangeOut({
        id: trimDateDay(exchange.date),
        date: trimDateDay(exchange.date),
        totalAmount: 0,
      });
    }
    dailyOut.totalAmount += exchange.amount;
    dailyOuts.set(dailyOut.date, dailyOut);
  }
  return dailyOuts;
}

async function resolveMonthlyIns(
  dailyIns: Map<string, DatedRecord>,
  monthlyIns: Map<string, DatedRecord>,
  ctx: DataHandlerContext<Store>
) {
  let dates = Array.from(dailyIns.keys()).map((date) => trimStringMonth(date));
  let existingMonthlyIns = await ctx.store
    .find(MonthlyExchangeIn, {
      where: {
        date: In(dates),
      },
    })
    .then(
      (monthlyIns) =>
        new Map(monthlyIns.map((monthlyIn) => [monthlyIn.date, monthlyIn])) // Change the type of 'monthlyIns' to 'MonthlyExchangeIn[]'
    );
  for (let dailyIn of dailyIns.values()) {
    let monthlyIn = existingMonthlyIns.get(trimStringMonth(dailyIn.date));
    if (!monthlyIn) {
      monthlyIn = new MonthlyExchangeIn({
        id: dailyIn.date,
        date: dailyIn.date,
        totalAmount: 0,
      });
    }
    monthlyIn.totalAmount += dailyIn.totalAmount;
    monthlyIns.set(monthlyIn.date, monthlyIn);
  }
  return monthlyIns;
}

async function resolveMonthlyOuts(
  dailyOuts: Map<string, DatedRecord>,
  monthlyOuts: Map<string, DatedRecord>,
  ctx: DataHandlerContext<Store>
) {
  let dates = Array.from(dailyOuts.keys()).map((date) => trimStringMonth(date));
  let existingMonthlyOuts = await ctx.store
    .find(MonthlyExchangeOut, {
      where: {
        date: In(dates),
      },
    })
    .then(
      (monthlyOuts) =>
        new Map(monthlyOuts.map((monthlyOut) => [monthlyOut.date, monthlyOut])) // Change the type of 'monthlyOuts' to 'MonthlyExchangeOut[]'
    );
  for (let dailyOut of dailyOuts.values()) {
    let monthlyOut = existingMonthlyOuts.get(trimStringMonth(dailyOut.date));
    if (!monthlyOut) {
      monthlyOut = new MonthlyExchangeOut({
        id: dailyOut.date,
        date: dailyOut.date,
        totalAmount: 0,
      });
    }
    monthlyOut.totalAmount += dailyOut.totalAmount;
    monthlyOuts.set(monthlyOut.date, monthlyOut);
  }
  return monthlyOuts;
}

function trimStringMonth(date: string): string {
  return date.substring(0, 7);
}
