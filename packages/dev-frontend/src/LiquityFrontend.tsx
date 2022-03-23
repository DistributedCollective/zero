import React from "react";
import { Flex, Container } from "theme-ui";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { Wallet } from "@ethersproject/wallet";

import { Decimal, Difference, Trove } from "@liquity/lib-base";
import { LiquityStoreProvider } from "@liquity/lib-react";

import { useLiquity } from "./hooks/LiquityContext";
import { TransactionMonitor } from "./components/Transaction";
import { Header } from "./components/Header";

import { PageSwitcher } from "./pages/PageSwitcher";
import { RiskyTrovesPage } from "./pages/RiskyTrovesPage";
import { RedemptionPage } from "./pages/RedemptionPage";

import { TroveViewProvider } from "./components/Trove/context/TroveViewProvider";
import { StabilityViewProvider } from "./components/Stability/context/StabilityViewProvider";

type LiquityFrontendProps = {
  loader?: React.ReactNode;
};
export const LiquityFrontend: React.FC<LiquityFrontendProps> = ({ loader }) => {
  const { account, provider, liquity } = useLiquity();

  // For console tinkering ;-)
  Object.assign(window, {
    account,
    provider,
    liquity,
    Trove,
    Decimal,
    Difference,
    Wallet
  });

  return (
    <LiquityStoreProvider {...{ loader }} store={liquity.store}>
      <Router>
        <TroveViewProvider>
          <StabilityViewProvider>
            <Flex sx={{ flexDirection: "column", minHeight: "100%" }}>
              <Header />
              <Container
                variant="main"
                sx={{
                  display: "flex",
                  flexGrow: 1,
                  flexDirection: "column",
                  alignItems: "center"
                }}
              >
                <Switch>
                  <Route path="/" exact>
                    <PageSwitcher />
                  </Route>
                  <Route path="/liquidation">
                    <RiskyTrovesPage />
                  </Route>
                  <Route path="/redemption">
                    <RedemptionPage />
                  </Route>
                </Switch>
              </Container>
            </Flex>
          </StabilityViewProvider>
        </TroveViewProvider>
      </Router>
      <TransactionMonitor />
    </LiquityStoreProvider>
  );
};
