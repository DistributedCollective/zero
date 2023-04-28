const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('./rskSovrynMainnet');
const alphas = require('./mainnetAddressListQA.json');
const proxy = require('./rskSovrynMainnet/GeneralZero_Proxy.json')

for(let i = 0; i < Object.keys(alphas).length; i++){

    let alpha = Object.keys(alphas)[i];
    let found = false;

    for(let j = 0; j < files.length; j++){

      let file = files[j];
      let fileExt = path.extname(file);
      if (fileExt == '.json') {

        let fileName = path.basename(file, '.json');    
        if(fileName.includes(alpha)){

          let subStrProxy = 'Proxy';
          let subStrImpl = 'Impl';
          let subStrSpecial = 'RedeemOps';
          if(fileName.includes(subStrProxy) ||
            (!fileName.includes(subStrImpl) && !fileName.includes(subStrSpecial))){

            found = true;
            console.log(fileName);

          } else {

            console.log(' untouched ' + fileName);

          }

        }

      }

    }

    if(!found){
    
        let artifactPath = 
          alpha == "CommunityIssuance" ?
          path.join('../../artifacts/contracts/ZERO/', alpha + '.sol/', alpha + '.json') :
          path.join('../../artifacts/contracts/', alpha + '.sol/', alpha + '.json');

        if (fs.existsSync(artifactPath)) {
    
          let artifactProxy = proxy;
          let artifactLogicProxy = require(artifactPath);
          
          let artifactProxyPath = path.join('./rskSovrynMainnet/', alpha + '_Proxy.json');
          let artifactLogicProxyPath = path.join('./rskSovrynMainnet/', alpha + '.json');
          
          artifactProxy.address = artifactLogicProxy.address = Object.values(alphas)[i];

          let entriesArtifactProxy = Object.entries(artifactProxy);
          let entriesArtifactLogicProxy = Object.entries(artifactLogicProxy);

          entriesArtifactProxy.unshift(
            entriesArtifactProxy.splice(
              entriesArtifactProxy.findIndex(
                ([key, value]) => key === 'address'), 1)[0]);

          entriesArtifactLogicProxy.unshift(
            entriesArtifactLogicProxy.splice(
              entriesArtifactLogicProxy.findIndex(
                ([key, value]) => key === 'address'), 1)[0]);
          
          let reorderedArtifactProxy = Object.fromEntries(entriesArtifactProxy);
          let reorderedArtifactLogicProxy = Object.fromEntries(entriesArtifactLogicProxy);
          
          fs.writeFileSync(artifactProxyPath, JSON.stringify(reorderedArtifactProxy, null, 2), {flag: 'w+'});
          fs.writeFileSync(artifactLogicProxyPath, JSON.stringify(reorderedArtifactLogicProxy, null, 2), {flag: 'w+'});
    
          console.log(alpha);
          console.log(alpha + '_Proxy.json');
          
        } else {
          
          console.log(alpha + ' not available');
          console.log(alpha + '_Proxy.json not available');        
    
        }
        
    }

}