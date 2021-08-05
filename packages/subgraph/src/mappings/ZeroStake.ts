import { StakeChanged, StakingGainsWithdrawn } from "../../generated/ZEROStaking/ZEROStaking";

import { updateStake, withdrawStakeGains } from "../entities/ZeroStake";

export function handleStakeChanged(event: StakeChanged): void {
  updateStake(event, event.params.staker, event.params.newStake);
}

export function handleStakeGainsWithdrawn(event: StakingGainsWithdrawn): void {
  withdrawStakeGains(event, event.params.staker, event.params.ZUSDGain, event.params.ETHGain);
}
