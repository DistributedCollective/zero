# @sovryn-zero/lib-ethers

[Ethers](https://www.npmjs.com/package/ethers)-based library for reading Zero protocol state and sending transactions.

## Quickstart

Install in your project:

```
npm install @sovryn-zero/lib-base @sovryn-zero/lib-ethers ethers@^5.0.0
```

Connecting to a blockchain node and sending a transaction:

```javascript
const { Wallet, providers } = require("ethers");
const { EthersLiquity } = require("@sovryn-zero/lib-ethers");

async function example() {
  const provider = new providers.JsonRpcProvider("http://localhost:8545");
  const wallet = new Wallet(process.env.PRIVATE_KEY).connect(provider);
  const zero = await EthersLiquity.connect(wallet);

  const { newTrove } = await zero.openTrove({
    depositCollateral: 5, // BTC
    borrowZUSD: 2000
  });

  console.log(`Successfully opened a Zero Trove (${newTrove})!`);
}
```

## More examples

See [packages/examples](https://github.com/DistributedCollective/zero/tree/master/packages/examples) in the repo.

@sovryn-zero's [UI](https://github.com/DistributedCollective/zero/tree/master/packages/dev-frontend) itself contains many examples of `@sovryn-zero/lib-ethers` use.

## API Reference

For now, it can be found in the public Sovryn [Zero repo](https://github.com/DistributedCollective/zero/blob/master/docs/sdk/lib-ethers.md).

