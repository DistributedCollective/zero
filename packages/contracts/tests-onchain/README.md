# Running onchain tests
The onchain tests are supposed to run on a forked chains - mainnet or testnet.  

## Pre-requisites
set ACC_QTY node env var to 20 before running hardhat node:  

``` 
export ACC_QTY=20 && npx hardhat node ... 
```   

## Run node and test

### 1. Run node
   ```
   npx hardhat node --fork https://mainnet-dev.sovryn.app/rpc --no-deploy --fork-block-number 5103312
   ```  

   where `--fork-block-number` is optional - use to time travel back to a needed state  

### 2. Run test 
   ```
   npx hardhat test tests-onchain/test-file-name.js --network X
   ```  

where `X`: either `rskForkedMainnet` or `rskForkedTestnet`
use an ad-hoc `rskForkedMainnetFlashback` / `rskForkedMainnetFlashback`
use the former if all the hardhat deployments were deployed at the forked block number
use the latter and put all the needed deployments to the `external/deployments/rskForkedMainnetFlashback`/`external/deployments/rskForkedTestnetFlashback`  folder otherwise - you normally want to use this to exclude contracts that were not deployed by the time of the forked block, so only the ones put there will be seen as deployed