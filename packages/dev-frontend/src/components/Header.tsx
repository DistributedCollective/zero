import React, { useEffect, useState } from "react";
import { Box, Container, NavLink } from "theme-ui";

import { UserAddress } from "./UserAddress";
import { UserAccount } from "./UserAccount";
import { Icon } from "./Icon";
import { useWeb3React } from "@web3-react/core";
import { ReactComponent as SovLogo } from "../assets/logo.svg";
import { getConfig, LiquityFrontendConfig } from "../config";

interface Props {
  hideDetails?: boolean;
}
export const Header: React.FC<Props> = ({ hideDetails }) => {
  const { chainId } = useWeb3React();
  const [config, setConfig] = useState<LiquityFrontendConfig>();

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  return (
    <Container variant="header">
      <Box sx={{ flex: [null, null, null, null, 1] }}>
        <NavLink
          href={`https://${config?.testnetOnly || chainId === 31 ? "test" : "live"}.sovryn.app/`}
        >
          <Icon name="chevron-left" />
        </NavLink>
      </Box>
      <SovLogo />
      {!hideDetails && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "end", flex: 1 }}>
          <Box sx={{ mr: 24 }}>
            <UserAccount />
          </Box>
          <UserAddress />
        </Box>
      )}
      {hideDetails && <Box sx={{ justifyContent: "end", flex: 1 }}></Box>}
    </Container>
  );
};
