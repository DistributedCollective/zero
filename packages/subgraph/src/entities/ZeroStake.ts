import { ethereum, Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

import { ZeroStakeChange, ZeroStake } from "../../generated/schema";

import { decimalize, DECIMAL_ZERO, BIGINT_ZERO } from "../utils/bignumbers";

import { beginChange, initChange, finishChange } from "./Change";
import { getUser } from "./User";
import { handleZEROStakeChange } from "./Global";

function startZEROStakeChange(event: ethereum.Event): ZeroStakeChange {
  let sequenceNumber = beginChange();
  let stakeChange = new ZeroStakeChange(sequenceNumber.toString());
  stakeChange.issuanceGain = DECIMAL_ZERO;
  stakeChange.redemptionGain = DECIMAL_ZERO;
  initChange(stakeChange, event, sequenceNumber);
  return stakeChange;
}

function finishZEROStakeChange(stakeChange: ZeroStakeChange): void {
  finishChange(stakeChange);
  stakeChange.save();
}

function getUserStake(address: Address): ZeroStake | null {
  let user = getUser(address);

  if (user.stake == null) {
    return null;
  }

  return ZeroStake.load(user.stake);
}

function createStake(address: Address): ZeroStake {
  let user = getUser(address);
  let stake = new ZeroStake(address.toHexString());

  stake.owner = user.id;
  stake.amount = DECIMAL_ZERO;

  user.stake = stake.id;
  user.save();

  return stake;
}

function getOperationType(stake: ZeroStake | null, nextStakeAmount: BigDecimal): string {
  let isCreating = stake.amount == DECIMAL_ZERO && nextStakeAmount > DECIMAL_ZERO;
  if (isCreating) {
    return "stakeCreated";
  }

  let isIncreasing = nextStakeAmount > stake.amount;
  if (isIncreasing) {
    return "stakeIncreased";
  }

  let isRemoving = nextStakeAmount == DECIMAL_ZERO;
  if (isRemoving) {
    return "stakeRemoved";
  }

  return "stakeDecreased";
}

export function updateStake(event: ethereum.Event, address: Address, newStake: BigInt): void {
  let stake = getUserStake(address);
  let isUserFirstStake = stake == null;

  if (stake == null) {
    stake = createStake(address);
  }

  let nextStakeAmount = decimalize(newStake);

  let stakeChange = startZEROStakeChange(event);
  stakeChange.stake = stake.id;
  stakeChange.stakeOperation = getOperationType(stake, nextStakeAmount);
  stakeChange.amountBefore = stake.amount;
  stakeChange.amountChange = nextStakeAmount.minus(stake.amount);
  stakeChange.amountAfter = nextStakeAmount;

  stake.amount = nextStakeAmount;

  handleZEROStakeChange(stakeChange, isUserFirstStake);

  finishZEROStakeChange(stakeChange);

  stake.save();
}

export function withdrawStakeGains(
  event: ethereum.Event,
  address: Address,
  ZUSDGain: BigInt,
  ETHGain: BigInt
): void {
  if (ZUSDGain == BIGINT_ZERO && ETHGain == BIGINT_ZERO) {
    return;
  }

  let stake = getUserStake(address) || createStake(address);
  let stakeChange: ZeroStakeChange = startZEROStakeChange(event);
  stakeChange.stake = stake.id;
  stakeChange.stakeOperation = "gainsWithdrawn";
  stakeChange.issuanceGain = decimalize(ZUSDGain);
  stakeChange.redemptionGain = decimalize(ETHGain);
  stakeChange.amountBefore = stake.amount;
  stakeChange.amountChange = DECIMAL_ZERO;
  stakeChange.amountAfter = stake.amount;

  finishZEROStakeChange(stakeChange);

  stake.save();
}
