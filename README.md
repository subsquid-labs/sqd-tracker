[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/subsquid/squid-evm-template)

# SQD tracker squid

This squid tracks SQD token on Arbitrum One.

The requested data is transformed in batches by a single handler provided to the `processor.run()` method.

For a full list of supported networks and config options,
check the [`EvmBatchProcessor` overview](https://docs.subsquid.io/evm-indexing/evm-processor/) and the [setup section](https://docs.subsquid.io/evm-indexing/configuration/).

For a step-by-step migration guide from TheGraph, see [the dedicated docs page](https://docs.subsquid.io/migrate/migrate-subgraph/).

Dependencies: Node.js v16 or newer, Git, Docker.

## Quickstart

```bash
# 0. Install @subsquid/cli a.k.a. the sqd command globally
npm i -g @subsquid/cli

# 1. Retrieve the template
sqd init my_squid_name -t evm
cd my_squid_name

# 2. Install dependencies
npm ci

# 3. Start a Postgres database container and detach
sqd up

# 4. Build the squid
sqd build

# 5. Start both the squid processor and the GraphQL server
sqd run .
```

A GraphiQL playground will be available at [localhost:4350/graphql](http://localhost:4350/graphql).

You can also start squid services one by one:

```bash
sqd process
sqd serve
```

## API

### ExchangeIn

Represents an incoming exchange transaction.

- **id**: `ID!`
- **block**: `BigInt!`
- **hash**: `String!`
- **date**: `DateTime!`
- **from**: `String!`
- **to**: `String!`
- **amount**: `Float!`

### ExchangeOut

Represents an outgoing exchange transaction.

- **id**: `ID!`
- **block**: `BigInt!`
- **hash**: `String!`
- **date**: `DateTime!`
- **from**: `String!`
- **to**: `String!`
- **amount**: `Float!`

### DailyExchangeIn

Represents aggregated incoming exchange transactions on a daily basis.

- **id**: `ID!`
- **date**: `String!`
- **totalAmount**: `Float!`

### MonthlyExchangeIn

Represents aggregated incoming exchange transactions on a monthly basis.

- **id**: `ID!`
- **date**: `String!`
- **totalAmount**: `Float!`

### DailyExchangeOut

Represents aggregated outgoing exchange transactions on a daily basis.

- **id**: `ID!`
- **date**: `String!`
- **totalAmount**: `Float!`

### MonthlyExchangeOut

Represents aggregated outgoing exchange transactions on a monthly basis.

- **id**: `ID!`
- **date**: `String!`
- **totalAmount**: `Float!`

### CumulativeExchange

Represents the cumulative totals of exchange transactions.

- **id**: `ID!`
- **totalAmountIn**: `Float!`
- **totalAmountOut**: `Float!`

### DailyTransfers

Represents aggregated transfer activity on a daily basis.

- **id**: `ID!`
- **date**: `String!`
- **totalTransfers**: `Int!`
- **totalAmount**: `Float!`

### Holder

Represents a wallet holder and their balance.

- **id**: `ID!`
- **address**: `String!`
- **balance**: `Float!`
- **type**: `HolderType!`

### HolderType

Defines the type of holder based on their balance.

- **SHRIMP**
- **GOLDFISH**
- **DOLPHIN**
- **WHALE**

## GraphQL API

The GraphQL API provides several queries to interact with the data. Below are some example queries.

## Example Queries

### Get Daily Exchange In Records

```graphql
query {
  dailyExchangeIns {
    id
    date
    totalAmount
  }
}
```

````

### Get Holder Details

```graphql
query {
  holder(id: "1") {
    id
    address
    balance
    type
  }
}
```

### Get Cumulative Exchange

```graphql
query {
  cumulativeExchange(id: "cumulative") {
    totalAmountIn
    totalAmountOut
  }
}
```

### Get Daily Transfers

```graphql
query {
  dailyTransfers {
    id
    date
    totalTransfers
    totalAmount
  }
}
```
````
