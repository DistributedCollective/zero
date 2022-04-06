import { Flex, Box, NavLink, Image } from "theme-ui";
import { Link } from "./Link";

export const Nav: React.FC = () => {
  return (
    <Box as="nav" sx={{ display: ["none", "flex"] }}>
      <Flex sx={{ flex: 1 }} />
      <Flex sx={{ justifyContent: "flex-start", alignItems: "center", my: 20, flex: 2 }}>
        <Image sx={{ height: 40, pr: 20 }} src="/images/zerologo.svg" alt="Zero" />
        <Link to="/">Dashboard</Link>
        <Link to="/liquidation">Liquidation</Link>
        <Link to="/redemption">Redemption</Link>
      </Flex>
      <Flex sx={{ justifyContent: "flex-end", alignItems: "center", flex: 2 }}>
        <NavLink
          href="https://wiki.sovryn.app/en/sovryn-dapp/subprotocols/zero-zusd"
          target="_blank"
        >
          DOCS
        </NavLink>
        <NavLink href="https://live.sovryn.app/swap" target="_blank">
          Trade
        </NavLink>
      </Flex>
      <Flex sx={{ flex: 1 }} />
    </Box>
  );
};
