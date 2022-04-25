import React from "react";
import { Web3ReactProvider } from "@web3-react/core";
import { Flex, Spinner, Heading, ThemeProvider, Paragraph, Link, Image } from "theme-ui";

import { BatchedWebSocketAugmentedWeb3Provider } from "@liquity/providers";
import { LiquityProvider } from "./hooks/LiquityContext";
import { WalletConnector } from "./components/WalletConnector";
import { TransactionProvider } from "./components/Transaction";
import { Icon } from "./components/Icon";
import { getConfig } from "./config";
import theme from "./theme";

import { DisposableWalletProvider } from "./testUtils/DisposableWalletProvider";
import { LiquityFrontend } from "./LiquityFrontend";
import { BrowserRouter } from "react-router-dom";
import { Header } from "./components/Header";

if (window.ethereum) {
  // Silence MetaMask warning in console
  Object.assign(window.ethereum, { autoRefreshOnNetworkChange: false });
}

if (process.env.REACT_APP_DEMO_MODE === "true") {
  const ethereum = new DisposableWalletProvider(
    `http://${window.location.hostname}:4444`,
    "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7"
  );

  Object.assign(window, { ethereum });
}

// Start pre-fetching the config
getConfig().then(config => {
  // console.log("Frontend config:");
  // console.log(config);
  Object.assign(window, { config });
});

const EthersWeb3ReactProvider: React.FC = ({ children }) => {
  return (
    <Web3ReactProvider getLibrary={provider => new BatchedWebSocketAugmentedWeb3Provider(provider)}>
      {children}
    </Web3ReactProvider>
  );
};

const UnsupportedLayout: React.FC = ({ children }) => (
  <Flex sx={{ flexDirection: "column", minHeight: "100%" }}>
    <Header hideDetails />
    <Image
      sx={{
        width: 138,
        mx: "auto",
        mt: 58
      }}
      src="/zero-logo.svg"
    />
    <Flex
      sx={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: "1",
        textAlign: "center",
        pb: 95
      }}
    >
      <Icon name="info-circle" />
      {children}
    </Flex>
  </Flex>
);

const UnsupportedMainnetFallback: React.FC = () => (
  <UnsupportedLayout>
    <Paragraph sx={{ mt: 3 }}>
      Please switch your wallet network to
      <br /> RSK Testnet.
    </Paragraph>

    <Paragraph>
      If you'd like to use Zero on mainnet, please go{" "}
      <Link href="https://live.sovryn.app/zero">
        here <Icon name="external-link-alt" size="xs" />
      </Link>
      .
    </Paragraph>
  </UnsupportedLayout>
);

const App = () => {
  const loader = (
    <Flex sx={{ alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Spinner sx={{ m: 2, color: "text" }} size="32px" />
      <Heading>Loading...</Heading>
    </Flex>
  );

  const unsupportedNetworkFallback = (chainId: number) => (
    <UnsupportedLayout>
      <Paragraph sx={{ mt: 3, mb: 1 }}>
        Zero is not yet deployed to {chainId === 30 ? "RSK Mainnet" : "this network"}.
      </Paragraph>
      Please switch to RSK Testnet.
    </UnsupportedLayout>
  );

  return (
    <EthersWeb3ReactProvider>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <WalletConnector loader={loader}>
            <LiquityProvider
              loader={loader}
              unsupportedNetworkFallback={unsupportedNetworkFallback}
              unsupportedMainnetFallback={<UnsupportedMainnetFallback />}
            >
              <TransactionProvider>
                <LiquityFrontend loader={loader} />
              </TransactionProvider>
            </LiquityProvider>
          </WalletConnector>
        </BrowserRouter>
      </ThemeProvider>
    </EthersWeb3ReactProvider>
  );
};

export default App;
