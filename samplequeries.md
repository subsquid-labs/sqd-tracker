- exchange inflows (transfers to exchange hot wallets)
  -- daily

  ```graphql
  query Query {
    dailyExchangeIns {
      id
    }
  }
  ```

  -- monthly

  ```graphql
  query Query {
    monthlyExchangeIns
  }
  ```

-- cummulative

```graphql
query Query {
  cumulativeExchanges {
    id
    totalAmountIn
  }
}
```

- exchange outflows (transfers from the exchange hot wallets)
  -- daily

  ```graphql
  query Query {
    dailyExchangeOuts {
      id
    }
  }
  ```

  -- monthly

```graphql
query Query {
  monthlyExchangeOuts {
    id
    totalAmount
    date
  }
}
```

-- cummulative

```graphql
query Query {
  cumulativeExchanges {
    id
    totalAmountOut
  }
}
```

- number of addresses with SQD
- number of shrimp addresses (1-1000) SQD
- number of goldfish addys
- dolphins
- whales
  -- number of transfers daily
  -- cummulative value of transfers daily (edited)

```

```
