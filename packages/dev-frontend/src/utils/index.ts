import type { BigNumberish } from "@ethersproject/bignumber";
import BigNumber from "bignumber.js";
import { formatUnits } from "@ethersproject/units";
import { ethers } from "ethers";

export const fromWei = (value: BigNumberish | undefined, decimals = 2) => {
  const n = new BigNumber(ethers.utils.formatEther((value || "0").toString()));
  if (n.isZero()) return "0";
  return n.toFixed(decimals);
};

export const isZero = (value: string) => new BigNumber(value).isZero();

export const parseBalance = (
  value: BigNumberish | undefined,
  decimals = 18,
  decimalsToDisplay = 1
) => parseFloat(formatUnits(value || 0, decimals)).toFixed(decimalsToDisplay);
