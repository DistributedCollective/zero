# @sovryn-zero/lib-ethers  

[![GitHub license](https://img.shields.io/github/license/DistributedCollective/zero)](/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/DistributedCollective/zero)](https://github.com/DistributedCollective/zero/stargazers)
[![Zero README](https://img.shields.io/badge/readme-gray?style=flat&logo=ZeroMQ&logoColor=green&link=/README.md)](/README.md)  

[Ethers](https://www.npmjs.com/package/ethers)-based library for reading Zero protocol state and sending transactions.

## Quickstart

### Install in your project:

  ```
  npm install @sovryn-zero/lib-base @sovryn-zero/lib-ethers ethers@^5.0.0
  ```  

  To install early access releases (pre-releases) - use a specific version to install:  

  ```
  npm install @sovryn-zero/lib-ethers@1.0.0-early.access.4
  ```  

  The actual early access release version is [here](https://github.com/DistributedCollective/zero/blob/sdk-early-access/packages/lib-ethers/package.json#L3).  


### Connecting to an Ethereum node and sending a transaction:

```javascript
const { Wallet, providers } = require("ethers");
const { EthersLiquity } = require("@sovryn-zero/lib-ethers");

async function example() {
  const provider = new providers.JsonRpcProvider("http://localhost:8545");
  const wallet = new Wallet(process.env.PRIVATE_KEY).connect(provider);
  const zero = await EthersLiquity.connect(wallet);

  const { newTrove } = await zero.openTrove({
    depositCollateral: 5, // ETH
    borrowZUSD: 2000
  });

  console.log(`Successfully opened a Zero Trove (${newTrove})!`);
}
```

## More examples

See [packages/examples](https://github.com/DistributedCollective/zero/tree/master/packages/examples) in the repo.

@sovryn-zero's [UI](https://github.com/DistributedCollective/zero/tree/master/packages/dev-frontend) itself contains many examples of `@sovryn-zero/lib-ethers` use.

## API Reference

[API Reference](https://github.com/DistributedCollective/zero/blob/master/docs/sdk/lib-ethers.md).

