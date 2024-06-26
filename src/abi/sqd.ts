import * as p from '@subsquid/evm-codec'
import { event, fun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    Approval: event("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", {"owner": indexed(p.address), "spender": indexed(p.address), "value": p.uint256}),
    Transfer: event("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", {"from": indexed(p.address), "to": indexed(p.address), "value": p.uint256}),
}

export const functions = {
    allowance: fun("0xdd62ed3e", {"owner": p.address, "spender": p.address}, p.uint256),
    approve: fun("0x095ea7b3", {"spender": p.address, "value": p.uint256}, p.bool),
    balanceOf: fun("0x70a08231", {"account": p.address}, p.uint256),
    bridgeBurn: fun("0x74f4f547", {"account": p.address, "amount": p.uint256}, ),
    bridgeMint: fun("0x8c2a993e", {"account": p.address, "amount": p.uint256}, ),
    decimals: fun("0x313ce567", {}, p.uint8),
    l1Address: fun("0xc2eeeebd", {}, p.address),
    l2Gateway: fun("0x8fa74a0e", {}, p.address),
    name: fun("0x06fdde03", {}, p.string),
    symbol: fun("0x95d89b41", {}, p.string),
    totalSupply: fun("0x18160ddd", {}, p.uint256),
    transfer: fun("0xa9059cbb", {"to": p.address, "value": p.uint256}, p.bool),
    transferFrom: fun("0x23b872dd", {"from": p.address, "to": p.address, "value": p.uint256}, p.bool),
}

export class Contract extends ContractBase {

    allowance(owner: AllowanceParams["owner"], spender: AllowanceParams["spender"]) {
        return this.eth_call(functions.allowance, {owner, spender})
    }

    balanceOf(account: BalanceOfParams["account"]) {
        return this.eth_call(functions.balanceOf, {account})
    }

    decimals() {
        return this.eth_call(functions.decimals, {})
    }

    l1Address() {
        return this.eth_call(functions.l1Address, {})
    }

    l2Gateway() {
        return this.eth_call(functions.l2Gateway, {})
    }

    name() {
        return this.eth_call(functions.name, {})
    }

    symbol() {
        return this.eth_call(functions.symbol, {})
    }

    totalSupply() {
        return this.eth_call(functions.totalSupply, {})
    }
}

/// Event types
export type ApprovalEventArgs = EParams<typeof events.Approval>
export type TransferEventArgs = EParams<typeof events.Transfer>

/// Function types
export type AllowanceParams = FunctionArguments<typeof functions.allowance>
export type AllowanceReturn = FunctionReturn<typeof functions.allowance>

export type ApproveParams = FunctionArguments<typeof functions.approve>
export type ApproveReturn = FunctionReturn<typeof functions.approve>

export type BalanceOfParams = FunctionArguments<typeof functions.balanceOf>
export type BalanceOfReturn = FunctionReturn<typeof functions.balanceOf>

export type BridgeBurnParams = FunctionArguments<typeof functions.bridgeBurn>
export type BridgeBurnReturn = FunctionReturn<typeof functions.bridgeBurn>

export type BridgeMintParams = FunctionArguments<typeof functions.bridgeMint>
export type BridgeMintReturn = FunctionReturn<typeof functions.bridgeMint>

export type DecimalsParams = FunctionArguments<typeof functions.decimals>
export type DecimalsReturn = FunctionReturn<typeof functions.decimals>

export type L1AddressParams = FunctionArguments<typeof functions.l1Address>
export type L1AddressReturn = FunctionReturn<typeof functions.l1Address>

export type L2GatewayParams = FunctionArguments<typeof functions.l2Gateway>
export type L2GatewayReturn = FunctionReturn<typeof functions.l2Gateway>

export type NameParams = FunctionArguments<typeof functions.name>
export type NameReturn = FunctionReturn<typeof functions.name>

export type SymbolParams = FunctionArguments<typeof functions.symbol>
export type SymbolReturn = FunctionReturn<typeof functions.symbol>

export type TotalSupplyParams = FunctionArguments<typeof functions.totalSupply>
export type TotalSupplyReturn = FunctionReturn<typeof functions.totalSupply>

export type TransferParams = FunctionArguments<typeof functions.transfer>
export type TransferReturn = FunctionReturn<typeof functions.transfer>

export type TransferFromParams = FunctionArguments<typeof functions.transferFrom>
export type TransferFromReturn = FunctionReturn<typeof functions.transferFrom>

