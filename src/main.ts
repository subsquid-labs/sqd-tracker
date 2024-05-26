import { Store, TypeormDatabase } from "@subsquid/typeorm-store";
import {
  ExchangeIn,
  DailyExchangeIn,
  MonthlyExchangeIn,
  DailyExchangeOut,
  MonthlyExchangeOut,
  CumulativeStats,
  ExchangeOut,
  Holder,
  HolderType,
  Transfer as TransferEntity,
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
export type DatedRecord =
  | DailyExchangeIn
  | MonthlyExchangeIn
  | DailyExchangeOut
  | MonthlyExchangeOut;

type HolderOp = {
  addr: string;
  value: bigint;
  isNegative: boolean;
};

type ExchangeRecord = ExchangeIn | ExchangeOut;

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
  let cumulative = await createOrGetCumulativeRecord(ctx);
  let holders = new Map<string, Holder>();
  let dailyIns = new Map<string, DatedRecord>();
  let dailyOuts = new Map<string, DatedRecord>();
  let monthlyIns = new Map<string, DatedRecord>();
  let monthlyOuts = new Map<string, DatedRecord>();
  let transfers: TransferEntity[] = [];
  let holderOps: HolderOp[] = [];
  let exchangeIns = [];
  let exchangeOuts = [];
  for (let c of ctx.blocks) {
    for (let log of c.logs) {
      let { from, to, value } = sqdAbi.events.Transfer.decode(log);
      // save all transfers
      let transfer: TransferEntity = new TransferEntity({
        id: log.id,
        from,
        to,
        block: BigInt(c.header.height),
        amount: Number(value / BigInt(10 ** DECIMALS)),
        hash: log.transactionHash,
        date: new Date(c.header.timestamp),
      });
      transfers.push(transfer);
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
    cumulative.totalExchangeAmountIn += totalAmountIn;

    //total amountOut for these logs

    const totalAmountOut = exchangeOuts.reduce(
      (sum, exchangeOut) => sum + exchangeOut.amount,
      0
    );
    cumulative.totalExchangeAmountOut += totalAmountOut;
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
  await ctx.store.upsert(transfers);
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

  let shrimpCount = await ctx.store.count(Holder, {
    where: { type: HolderType.SHRIMP },
  });
  let goldfishCount = await ctx.store.count(Holder, {
    where: { type: HolderType.GOLDFISH },
  });
  let dolphinCount = await ctx.store.count(Holder, {
    where: { type: HolderType.DOLPHIN },
  });
  let whaleCount = await ctx.store.count(Holder, {
    where: { type: HolderType.WHALE },
  });
  let totalTransfersAmount = transfers.reduce(
    (sum, transfer) => sum + transfer.amount,
    0
  );
  cumulative.dolphinCount = dolphinCount;
  cumulative.goldfishCount = goldfishCount;
  cumulative.shrimpCount = shrimpCount;
  cumulative.whaleCount = whaleCount;
  cumulative.totalTransfersAmount += totalTransfersAmount;

  await ctx.store.save(cumulative);
});

function processTransfer(log: Log, c: BlockData): Transfer {
  let { from, to, value } = sqdAbi.events.Transfer.decode(log);
  let amountNum = Number(value / BigInt(10 ** DECIMALS));
  let transfer: Transfer = {
    id: log.transactionHash,
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
  let cumulativeRecord = await ctx.store.findOne(CumulativeStats, {
    where: { id: "cumulative" },
  });
  if (!cumulativeRecord) {
    return new CumulativeStats({
      id: "cumulative",
      totalExchangeAmountIn: 0,
      totalExchangeAmountOut: 0,
      totalTransfersAmount: 0,
      dolphinCount: 0,
      goldfishCount: 0,
      shrimpCount: 0,
      whaleCount: 0,
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

/* async function resolveDailyIns(
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
} */

/* async function resolveDailyOuts(
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
} */

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
        date: trimStringMonth(dailyIn.date),
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
        date: trimStringMonth(dailyOut.date),
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

// async function resolveMonthlyRecords<T extends DatedRecord>(
//   dailyRecords: Map<string, DatedRecord>,
//   monthlyRecords: Map<string, DatedRecord>,
//   modelType: typeof MonthlyExchangeIn | typeof MonthlyExchangeOut, // Adjust the types accordingly
//   ctx: DataHandlerContext<Store>
// ) {
//   const dates = Array.from(dailyRecords.keys()).map((date) =>
//     trimStringMonth(date)
//   );
//   const existingMonthlyRecords = await ctx.store
//     .find(modelType, {
//       where: {
//         date: In(dates),
//       },
//     })
//     .then(
//       (monthlyRecords) =>
//         new Map(
//           monthlyRecords.map((monthlyRecord) => [
//             monthlyRecord.date,
//             monthlyRecord,
//           ])
//         ) // Change the type of 'monthlyRecords' to 'MonthlyExchangeIn[]' or 'MonthlyExchangeOut[]'
//     );

//   for (const dailyRecord of dailyRecords.values()) {
//     let monthlyRecord = existingMonthlyRecords.get(
//       trimStringMonth(dailyRecord.date)
//     );
//     if (!monthlyRecord) {
//       monthlyRecord = new modelType({
//         id: dailyRecord.date,
//         date: dailyRecord.date,
//         totalAmount: 0,
//       }) as T; // Cast to T
//     }
//     monthlyRecord.totalAmount += dailyRecord.totalAmount;
//     monthlyRecords.set(monthlyRecord.date, monthlyRecord);
//   }

//   return monthlyRecords;
// }

// async function resolveMonthlyIns(
//   dailyIns: Map<string, DatedRecord>,
//   monthlyIns: Map<string, DatedRecord>,
//   ctx: DataHandlerContext<Store>
// ) {
//   return resolveMonthlyRecords(dailyIns, monthlyIns, MonthlyExchangeIn, ctx);
// }

// async function resolveMonthlyOuts(
//   dailyOuts: Map<string, DatedRecord>,
//   monthlyOuts: Map<string, DatedRecord>,
//   ctx: DataHandlerContext<Store>
// ) {
//   return resolveMonthlyRecords(dailyOuts, monthlyOuts, MonthlyExchangeOut, ctx);
// }

// function trimStringMonth(date: string): string {
//   return date.substring(0, 7);
// }

async function resolveDailyRecords<T extends DatedRecord>(
  exchangeRecords: ExchangeRecord[],
  dailyRecords: Map<string, DatedRecord>,
  modelType: typeof DailyExchangeIn | typeof DailyExchangeOut, // Adjust the types accordingly
  ctx: DataHandlerContext<Store>
): Promise<Map<string, DatedRecord>> {
  const dates = exchangeRecords.map((exchange) => trimDateDay(exchange.date));
  const existingDailyRecords = await ctx.store
    .find(modelType, {
      where: {
        date: In(dates),
      },
    })
    .then(
      (dailyRecords) =>
        new Map(dailyRecords.map((record) => [record.date, record])) // Change the type of 'dailyRecords' to 'DailyExchangeIn[]' or 'DailyExchangeOut[]'
    );

  for (const exchange of exchangeRecords) {
    let dailyRecord = existingDailyRecords.get(trimDateDay(exchange.date));
    if (!dailyRecord) {
      dailyRecord = new modelType({
        id: trimDateDay(exchange.date),
        date: trimDateDay(exchange.date),
        totalAmount: 0,
      }) as T; // Cast to T
    }
    dailyRecord.totalAmount += exchange.amount;
    dailyRecords.set(dailyRecord.date, dailyRecord);
  }

  return dailyRecords;
}

async function resolveDailyIns(
  exchangeIns: ExchangeIn[],
  dailyIns: Map<string, DatedRecord>,
  ctx: DataHandlerContext<Store>
) {
  return resolveDailyRecords(exchangeIns, dailyIns, DailyExchangeIn, ctx);
}

async function resolveDailyOuts(
  exchangeOuts: ExchangeOut[],
  dailyOuts: Map<string, DatedRecord>,
  ctx: DataHandlerContext<Store>
) {
  return resolveDailyRecords(exchangeOuts, dailyOuts, DailyExchangeOut, ctx);
}
