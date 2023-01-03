sources: 
- packages/lib-ethers/utils/deploy.ts
- hh config task `deploy`
- deployer keys: packages/lib-ethers/.env
  - DEPLOYER_PK_TESTNET
  - DEPLOYER_PK_MAINNET


deploy: yarn workspace @sovryn-zero/lib-ethers hardhat deploy


set the 0x1 addresses to the marketMaker and presale contracts for rsktestnet network
then run prepare script in the contracts folder
then run tests from the lib-ethers and contracts folders
if all good then run the deployment for rsktestnet network

hh task deploy -> deployLiquity -> deploy.ts[deployAndSetupContracts]
