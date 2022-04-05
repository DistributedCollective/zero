import { Flex, Box, NavLink, Image } from "theme-ui";
import { Link } from "./Link";

export const Nav: React.FC = () => {
  return (
    <Box as="nav" sx={{ display: ["none", "flex"] }}>
      <Flex sx={{ justifyContent: "center", mr: 3, flex: 9 }}>
        <Image sx={{ height: 40}} src="/images/zerologo.svg" alt="Zero" />
        <Link to="/">Dashboard</Link>
        <Link sx={{ fontSize: 1 }} to="/liquidation">
          Liquidation
        </Link>
        <Link sx={{ fontSize: 1 }} to="/redemption">
          Redemption
        </Link>
      </Flex>
      <Flex sx={{ justifyContent: "flex-end", mr: 3, flex: 5 }}>
        <NavLink href="https://live.sovryn.app/swap" target="_blank">
          Trade
        </NavLink>
      </Flex>
    </Box>
  );
};
