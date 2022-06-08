import React from "react";
import { Button, Flex } from "theme-ui";

import {
  Decimal,
  Decimalish,
  LiquityStoreState,
  ZEROStake,
  ZEROStakeChange
} from "@sovryn-zero/lib-base";

import { LiquityStoreUpdate, useLiquityReducer, useLiquitySelector } from "@sovryn-zero/lib-react";

import { GT, COIN } from "../../strings";

import { useStakingView } from "./context/StakingViewContext";
import { StakingEditor } from "./StakingEditor";
import { StakingManagerAction } from "./StakingManagerAction";
import { ActionDescription, Amount } from "../ActionDescription";
import { ErrorDescription } from "../ErrorDescription";

const init = ({ zeroStake }: LiquityStoreState) => ({
  originalStake: zeroStake,
  editedZERO: zeroStake.stakedZERO
});

type StakeManagerState = ReturnType<typeof init>;
type StakeManagerAction =
  | LiquityStoreUpdate
  | { type: "revert" }
  | { type: "setStake"; newValue: Decimalish };

const reduce = (state: StakeManagerState, action: StakeManagerAction): StakeManagerState => {
  // console.log(state);
  // console.log(action);

  const { originalStake, editedZERO } = state;

  switch (action.type) {
    case "setStake":
      return { ...state, editedZERO: Decimal.from(action.newValue) };

    case "revert":
      return { ...state, editedZERO: originalStake.stakedZERO };

    case "updateStore": {
      const {
        stateChange: { zeroStake: updatedStake }
      } = action;

      if (updatedStake) {
        return {
          originalStake: updatedStake,
          editedZERO: updatedStake.apply(originalStake.whatChanged(editedZERO))
        };
      }
    }
  }

  return state;
};

const selectZEROBalance = ({ zeroBalance }: LiquityStoreState) => zeroBalance;

type StakingManagerActionDescriptionProps = {
  originalStake: ZEROStake;
  change: ZEROStakeChange<Decimal>;
};

const StakingManagerActionDescription: React.FC<StakingManagerActionDescriptionProps> = ({
  originalStake,
  change
}) => {
  const stakeZERO = change.stakeZERO?.prettify().concat(" ", GT);
  const unstakeZERO = change.unstakeZERO?.prettify().concat(" ", GT);
  const collateralGain = originalStake.collateralGain.nonZero?.prettify(4).concat(" RBTC");
  const zusdGain = originalStake.zusdGain.nonZero?.prettify().concat(" ", COIN);

  if (originalStake.isEmpty && stakeZERO) {
    return (
      <ActionDescription>
        You are staking <Amount>{stakeZERO}</Amount>.
      </ActionDescription>
    );
  }

  return (
    <ActionDescription>
      {stakeZERO && (
        <>
          You are adding <Amount>{stakeZERO}</Amount> to your stake
        </>
      )}
      {unstakeZERO && (
        <>
          You are withdrawing <Amount>{unstakeZERO}</Amount> to your wallet
        </>
      )}
      {(collateralGain || zusdGain) && (
        <>
          {" "}
          and claiming{" "}
          {collateralGain && zusdGain ? (
            <>
              <Amount>{collateralGain}</Amount> and <Amount>{zusdGain}</Amount>
            </>
          ) : (
            <>
              <Amount>{collateralGain ?? zusdGain}</Amount>
            </>
          )}
        </>
      )}
      .
    </ActionDescription>
  );
};

export const StakingManager: React.FC = () => {
  const { dispatch: dispatchStakingViewAction } = useStakingView();
  const [{ originalStake, editedZERO }, dispatch] = useLiquityReducer(reduce, init);
  const zeroBalance = useLiquitySelector(selectZEROBalance);

  const change = originalStake.whatChanged(editedZERO);
  const [validChange, description] = !change
    ? [undefined, undefined]
    : change.stakeZERO?.gt(zeroBalance)
    ? [
        undefined,
        <ErrorDescription>
          The amount you're trying to stake exceeds your balance by{" "}
          <Amount>
            {change.stakeZERO.sub(zeroBalance).prettify()} {GT}
          </Amount>
          .
        </ErrorDescription>
      ]
    : [change, <StakingManagerActionDescription originalStake={originalStake} change={change} />];

  const makingNewStake = originalStake.isEmpty;

  return (
    <StakingEditor title={"Staking"} {...{ originalStake, editedZERO, dispatch }}>
      {description ??
        (makingNewStake ? (
          <ActionDescription>Enter the amount of {GT} you'd like to stake.</ActionDescription>
        ) : (
          <ActionDescription>Adjust the {GT} amount to stake or withdraw.</ActionDescription>
        ))}

      <Flex variant="layout.cta">
        <Button
          variant="cancel"
          onClick={() => dispatchStakingViewAction({ type: "cancelAdjusting" })}
        >
          Cancel
        </Button>

        {validChange ? (
          <StakingManagerAction change={validChange}>Confirm</StakingManagerAction>
        ) : (
          <Button disabled>Confirm</Button>
        )}
      </Flex>
    </StakingEditor>
  );
};
