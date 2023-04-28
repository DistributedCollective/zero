## SCRIPTS TO HELP LOADING DEPLOYED ARTIFACTS  

Scripts that helps to load callable contract objects:  

### FIRST: Execute loadMainnetArtifacts  

It keeps pre-existent artifacts in the `rskSovrynMainnet` folder. If there is any upgrade, the artifacts can be erased, then execute: `$ node loadMainnetArtifacts`  

#### THEN: Execute loadTestnetArtifacts  

It takes from `artifacts` folder or from `rskSovrynMainnet` folder the abis of contracts and from `testnetAddressListQA.json`, the addresses.  
To execute the loading after any fresh upgrade: `$ node loadTestnetArtifacts`  