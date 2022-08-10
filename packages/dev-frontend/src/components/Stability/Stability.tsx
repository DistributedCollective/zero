import React from "react";
import { StabilityDepositManager } from "./StabilityDepositManager";
import { ActiveDeposit } from "./ActiveDeposit";
import { NoDeposit } from "./NoDeposit";
import { useStabilityView } from "./context/StabilityViewContext";
import { Heading } from "theme-ui";
import { Card } from "../Card";

export const Stability: React.FC = props => {
  return (
    <Card
      heading={
        <>
          <Heading className="heading">Stability Pool</Heading>
          <Heading as="h3" className="subheading">
            You can earn RBTC by depositing ZUSD.
          </Heading>
        </>
      }
    >
      <StabilityContent {...props} />
    </Card>
  );
};

export const StabilityContent: React.FC = props => {
  const { view } = useStabilityView();

  switch (view) {
    case "NONE": {
      return <NoDeposit {...props} />;
    }
    case "DEPOSITING": {
      return <StabilityDepositManager {...props} />;
    }
    case "ADJUSTING": {
      return <StabilityDepositManager {...props} />;
    }
    case "ACTIVE": {
      return <ActiveDeposit {...props} />;
    }
  }
};
