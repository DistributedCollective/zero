# PUBLISH SDK PACKAGES GUIDELINES
## **Typescript SDK** 
Currently `semantic-versioning` is setup but disabled for publishing automation for `lib-ethers` (typescript SDK).  
If enabled Git Actions CI runs `semantic-release` to publish `lib-base`, `lib-ethers`, `contracts` and `sdk-contracts`  packages.  
Most likely we will be using semi-manual publishing to mitigate human factor.  
Untill then we are using manual packages publishing:
- merge a branch to be published into `sdk-publish`
- bump packages versions to publish in `package.json` 
- follow the instructions below  


## **Solidity contracts (libraries)**  
To publish sdk-contracts package, from the package root run   

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

## typescript libraries

### lib-base
From the root tun `do-publish:lib-base` or if you want more control:
- cd to the package dir 
  - run CLI `yarn do-prepare`
  - run CLI `yarn publish`
  - check package is successfully published
  - create a release tag `lib-ethers/[release-version]` e.g. lib-base/v0.2.0 with -m "expose private _findHints -> public findHints"
### lib-ethers
From the root tun `do-publish:lib-base` or if you want more control
- cd to the package dir  
  - run CLI `yarn do-prepare`
  - remove unwanted for this release changes as needed
  - run `yarn  publish`
  - check package is successfully published
  - create a tag `lib-ethers/[release-version]` e.g. lib-ethers/v0.2.0 with -m "expose private _findHints -> public findHints"


