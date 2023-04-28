const fs = require('fs');
const path = require('path');

const filesInMainnet = fs.readdirSync('./rskSovrynMainnet');
const filesInTestnet = fs.readdirSync('./rskSovrynTestnet');
const alphas = require('./testnetAddressListQA.json');
const proxy = require('./rskSovrynTestnet/GeneralZero_Proxy.json')

for(let i = 0; i < Object.keys(alphas).length; i++){

  let alpha = Object.keys(alphas)[i];
  var foundInMainnet = false;
  let foundInTestnet = false;

  for(let j = 0; j < filesInTestnet.length; j++){

      let testnetFile = filesInTestnet[j];
      let fileExt = path.extname(testnetFile);
    
      if (fileExt == '.json') {

          let fileName = path.basename(testnetFile, '.json');

          if(fileName.includes(alpha)){

              let subStrProxy = 'Proxy';
              if(fileName.includes(subStrProxy)){

                foundInTestnet = true;
                console.log(fileName);
                
              } else {

                let subStrImpl = 'Impl';
                let subStrRedeemOps = 'RedeemOps';
                if(!fileName.includes(subStrImpl)&&
                  !fileName.includes(subStrRedeemOps)){

                  foundInTestnet = true;  
                  console.log(fileName);
                  
                } else {
                  console.log(' untouched ' + fileName);
                } 
                
              }

          }

      }

  }

  if(!foundInTestnet) {

    var artifactPath;

    for(let k = 0; k < filesInMainnet.length; k++){

      let mainnetFile = filesInMainnet[k];
      let fileExt = path.extname(mainnetFile);
    
      if (fileExt == '.json') {

          let fileName = path.basename(mainnetFile, '.json');

          if(fileName.includes(alpha)){

            let subStrProxy = 'Proxy';
            let subStrImpl = 'Impl';
            let subStrRedeemOps = 'RedeemOps';
            if(fileName.includes(subStrProxy)||
              (!fileName.includes(subStrImpl)&&
              !fileName.includes(subStrRedeemOps))
              ){

                foundInMainnet = true;
                artifactPath = './rskSovrynMainnet/' + fileName + '.json';
                let artifact = require(artifactPath);
                let artifactTestnetPath = './rskSovrynTestnet/' + artifactPath.slice(19);
                artifact.address = Object.values(alphas)[i];
                let entriesArtifact = Object.entries(artifact);
                entriesArtifact.unshift(
                  entriesArtifact.splice(
                    entriesArtifact.findIndex(
                      ([key, value]) => key === 'address'), 1)[0]);
                let reorderedArtifact = Object.fromEntries(entriesArtifact);
                fs.writeFileSync(artifactTestnetPath, JSON.stringify(reorderedArtifact, null, 2), {flag: 'w+'});
                console.log(fileName);
              
            } else {
              console.log(' untouched ' + fileName);
            } 
                
          }

      }

    }
    
  } 
  
  if(!foundInMainnet && !foundInTestnet) {

    let artifactPath = alpha == "CommunityIssuance" ?
      path.join('../../artifacts/contracts/ZERO/', alpha + '.sol/', alpha + '.json') :
      path.join('../../artifacts/contracts/', alpha + '.sol/', alpha + '.json');

    if (fs.existsSync(artifactPath)) {

      let artifactProxy = proxy;
      let artifactLogicProxy = require(artifactPath);
    
      let artifactProxyPath = path.join('./rskSovrynTestnet/', alpha + '_Proxy.json');
      let artifactLogicProxyPath = path.join('./rskSovrynTestnet/', alpha + '.json');
    
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