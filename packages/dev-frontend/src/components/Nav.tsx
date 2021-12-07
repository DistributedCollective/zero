import { Flex, Box, NavLink } from "theme-ui";
import { Link } from "./Link";

export const Nav: React.FC = () => {
  return (
    <Box as="nav" sx={{ display: ["none", "flex"], alignItems: "center", flex: 1 }}>
      <Flex>
        <Link to="/">Dashboard</Link>
        <NavLink href="https://live.sovryn.app/swap" target="_blank">Trade</NavLink>
      </Flex>
      <Flex sx={{ justifyContent: "flex-end", mr: 3, flex: 1 }}>
        <Link sx={{ fontSize: 1 }} to="/liquidation">
          Liquidation
        </Link>
        <Link sx={{ fontSize: 1 }} to="/redemption">
          Redemption
        </Link>
      </Flex>
    </Box>
  );
};
