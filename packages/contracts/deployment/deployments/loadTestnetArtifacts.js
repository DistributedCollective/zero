const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('./rskSovrynMainnet');
const alphas = require('./testnetAddressListQA.json');
const proxy = require('./rskSovrynTestnet/GeneralZero_Proxy.json')

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
              if(fileName.includes(subStrProxy)){

                found = true;
                console.log(fileName);
                
                let artifactProxy = require(
                  ('./rskSovrynMainnet/' + fileName + '.json'));
                artifactProxy.address = alphas[alpha];
                
                fs.writeFileSync(
                  ('./rskSovrynTestnet/' + fileName + '.json'), 
                  JSON.stringify(artifactProxy,null,2),{flag: 'w+'});

              } else {

                let subStrImpl = 'Impl';
                let subStrRedeemOps = 'RedeemOps';
                if(!fileName.includes(subStrImpl)&&
                  !fileName.includes(subStrRedeemOps)){

                  found = true;  
                  console.log(fileName);

                  let artifactLogicProxy = require(
                    ('./rskSovrynMainnet/' + fileName + '.json'));
                  artifactLogicProxy.address = alphas[alpha];

                  fs.writeFileSync(
                    path.join('./rskSovrynTestnet/', fileName + '.json'), 
                    JSON.stringify(artifactLogicProxy,null,2),{flag: 'w+'});                
                  
                }
                
              }
              console.log(fileName);

          }

      }

  }

  if(!found){
    
    let artifactPath = path.join('../../artifacts/contracts/', alpha + '.sol/', alpha + '.json');
    if (fs.existsSync(artifactPath)) {

      let artifactProxy = proxy;
      let artifactLogicProxy = require(artifactPath);
      
      let artifactProxyPath = path.join('./rskSovrynTestnet/', alpha + '_Proxy.json');
      let artifactLogicProxyPath = path.join('./rskSovrynTestnet/', alpha + '.json');
      
      artifactProxy.address = artifactLogicProxy.address = Object.values(alphas)[i];
      
      fs.writeFileSync(artifactLogicProxyPath, JSON.stringify(artifactLogicProxy, null, 2), {flag: 'w+'});
      fs.writeFileSync(artifactProxyPath, JSON.stringify(artifactProxy, null, 2), {flag: 'w+'});

      console.log(alpha);
      console.log(alpha + '_Proxy.json');
      
    } else {
      
      console.log(alpha + ' not available');
      console.log(alpha + '_Proxy.json not available');        

    }
    
  }

}