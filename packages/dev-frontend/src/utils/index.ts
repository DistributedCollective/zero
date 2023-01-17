import type { BigNumberish } from "@ethersproject/bignumber";
import BigNumber from "bignumber.js";
import { formatUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import { Decimal } from "@sovryn-zero/lib-base";

export const fromWei = (value: BigNumberish | undefined, decimals = 2) => {
  const n = new BigNumber(ethers.utils.formatEther((value || "0").toString()));
  if (n.isZero()) return "0";
  return n.toFixed(decimals);
};

export const toWei = (value: Decimal | BigNumberish | undefined) =>
  ethers.utils.parseEther((value || "0").toString()).toString();

export const isMainnet = process.env.REACT_APP_NETWORK === "mainnet";

export const isZero = (value: string) => new BigNumber(value).isZero();

export const parseBalance = (
  value: BigNumberish | undefined,
  decimals = 18,
  decimalsToDisplay = 2
) => new BigNumber(formatUnits(value || 0, decimals)).toFixed(decimalsToDisplay);

export const captchaSiteKey = process.env.REACT_APP_HCAPTCHA;
