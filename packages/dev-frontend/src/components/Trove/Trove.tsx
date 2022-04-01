import React from "react";
import { TroveManager } from "./TroveManager";
import { ReadOnlyTrove } from "./ReadOnlyTrove";
import { NoTrove } from "./NoTrove";
import { Opening } from "./Opening";
import { Adjusting } from "./Adjusting";
import { RedeemedTrove } from "./RedeemedTrove";
import { useTroveView } from "./context/TroveViewContext";
import { LiquidatedTrove } from "./LiquidatedTrove";
import { Decimal } from "@liquity/lib-base";
import { Heading } from "theme-ui";
import { Card } from "../Card";

export const Trove: React.FC = props => {
  return (
    <Card
      heading={
        <>
          <Heading className="heading">Line of Credit</Heading>
          <Heading as="h3" className="subheading">
            You can borrow ZUSD by opening a Line of Credit.
          </Heading>
        </>
      }
    >
      <TroveContent {...props} />
    </Card>
  );
};

export const TroveContent: React.FC = props => {
  const { view } = useTroveView();

  switch (view) {
    // loading state not needed, as main app has a loading spinner that blocks render until the liquity backend data is available
    case "ACTIVE": {
      return <ReadOnlyTrove {...props} />;
    }
    case "ADJUSTING": {
      return <Adjusting {...props} />;
    }
    case "CLOSING": {
      return <TroveManager {...props} collateral={Decimal.ZERO} debt={Decimal.ZERO} />;
    }
    case "OPENING": {
      return <Opening {...props} />;
    }
    case "LIQUIDATED": {
      return <LiquidatedTrove {...props} />;
    }
    case "REDEEMED": {
      return <RedeemedTrove {...props} />;
    }
    case "NONE": {
      return <NoTrove {...props} />;
    }
  }
};
