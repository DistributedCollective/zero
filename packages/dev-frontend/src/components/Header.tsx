import React from "react";
import { Box, Container, Image, NavLink } from "theme-ui";

import { UserAddress } from "./UserAddress";
import { UserAccount } from "./UserAccount";
import { Icon } from "./Icon";
import { useWeb3React } from "@web3-react/core";

export const Header: React.FC = () => {
  const { chainId } = useWeb3React();
  return (
    <Container variant="header">
      <Box sx={{ flex: [null, null, null, null, 1] }}>
        <NavLink href={`https://${chainId === 30 ? "live" : "test"}.sovryn.app/`}>
          <Icon name="chevron-left" />
        </NavLink>
      </Box>
      <Image sx={{ height: 35, mx: 4 }} src="/images/logo.svg" alt="Sovryn-Labs" />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "end", flex: 1 }}>
        <Box sx={{ mr: 24 }}>
          <UserAccount />
        </Box>
        <UserAddress />
      </Box>
    </Container>
  );
};
