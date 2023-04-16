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
                if(fileName.includes(subStrProxy)){

                  found = true;
                  console.log(fileName);

              } else {

                let subStrImpl = 'Impl';
                if(!fileName.includes(subStrImpl)){

                  found = true;  
                  console.log(fileName);
                  
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
          
          let artifactProxyPath = path.join('./rskSovrynMainnet/', alpha + '_Proxy.json');
          let artifactLogicProxyPath = path.join('./rskSovrynMainnet/', alpha + '.json');
          
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