import { isMainnet } from "../utils";

const rskMainnet = {
  xusd: "0xb5999795BE0EbB5bAb23144AA5FD6A02D080299F",
  zusd: "0xdB107FA69E33f05180a4C2cE9c2E7CB481645C2d",
  babelfish: "0x1440d19436bEeaF8517896bffB957a88EC95a00F"
};

const rskTestnet = {
  xusd: "0xa9262cc3fb54ea55b1b0af00efca9416b8d59570",
  zusd: "0x6b41566353d6C7B8C2a7931d498F11489DacAc29",
  babelfish: "0x1572D7E4a78A8AD14AE722E6fE5f5600a2c7A149"
};

export const addresses = isMainnet ? rskMainnet : rskTestnet;
