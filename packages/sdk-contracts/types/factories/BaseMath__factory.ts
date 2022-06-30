/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { BaseMath, BaseMathInterface } from "../BaseMath";

const _abi = [
  {
    inputs: [],
    name: "DECIMAL_PRECISION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x6080604052348015600f57600080fd5b5060878061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063a20baee614602d575b600080fd5b60336045565b60408051918252519081900360200190f35b670de0b6b3a76400008156fea2646970667358221220c34e0977370e6aa538ce85a4677f2d3362ea9a41bffea2dec396ce2164c2511e64736f6c634300060b0033";

export class BaseMath__factory extends ContractFactory {
  constructor(
    ...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>
  ) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<BaseMath> {
    return super.deploy(overrides || {}) as Promise<BaseMath>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): BaseMath {
    return super.attach(address) as BaseMath;
  }
  connect(signer: Signer): BaseMath__factory {
    return super.connect(signer) as BaseMath__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): BaseMathInterface {
    return new utils.Interface(_abi) as BaseMathInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): BaseMath {
    return new Contract(address, _abi, signerOrProvider) as BaseMath;
  }
}
