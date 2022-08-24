# PUBLISH SDK PACKAGES  
## **Typescript SDK** 
Currently semantic-versioning is used for publishing automation for `lib-ethers` (typescript SDK).  

## **Solidity contracts (libraries)**  
To publish solidity contracts (libraries) SDK, from the project root run   

```
yarn do-publish
```  
For verification before publishing run 
```
yarn do-pack
```  
It will create `.tgz` packages of `contracts` (sdk peerDependency) and `sdk-contracts` packages which can be used for testing import and usage from any repo. 

To install SDK package in another repository/folder - copy `sovryn-zero-contracts-package.tgz` and `sovryn-zero-sdk-contracts-package.tgz` from respective packages (folders) and install them from `.tgz` archives
```
npm install sovryn-zero-contracts-package.tgz sovryn-zero-sdk-contracts-package.tgz
```  
Import SDK libraries in contracts like this
```javascript
import "@sovryn-zero/contracts/libraries/BorrowerLib.sol";
```  
#TODO:  
[ ] Add detailed explanation of semantic-versioning publishing process
