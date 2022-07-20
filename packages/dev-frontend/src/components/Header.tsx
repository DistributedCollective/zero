import React, { useEffect, useState } from "react";
import { Box, Container, NavLink } from "theme-ui";

import { UserAddress } from "./UserAddress";
import { UserAccount } from "./UserAccount";
import { Icon } from "./Icon";
import { ReactComponent as SovLogo } from "../assets/logo.svg";
import { getConfig, LiquityFrontendConfig } from "../config";
import { isMainnet } from "../utils";

interface Props {
  hideDetails?: boolean;
}
export const Header: React.FC<Props> = ({ hideDetails }) => {
  const [, setConfig] = useState<LiquityFrontendConfig>();

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  return (
    <Container variant="header">
      <Box sx={{ flex: [null, null, null, null, 1] }}>
        <NavLink href={`https://${!isMainnet ? "test" : "live"}.sovryn.app/`}>
          <Icon name="chevron-left" />
        </NavLink>
      </Box>
      <Box sx={{ display: "flex", width: [150, 150, "auto"] }}>
        <SovLogo />
      </Box>
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
