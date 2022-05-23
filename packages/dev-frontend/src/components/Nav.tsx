import { Flex, NavLink, Image, Container } from "theme-ui";
import { Link } from "./Link";
import zeroLogo from "../assets/zerologo.svg";

export const Nav: React.FC = () => {
  return (
    <Container
      variant="main"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mt: 3,
        flexDirection: ["column", "column", "row"]
      }}
    >
      <Flex sx={{ alignItems: "center", flexDirection: ["column", "row"] }}>
        <Image sx={{ height: 40, pr: 20 }} src={zeroLogo} alt="Zero" />
        <Link to="/">Dashboard</Link>
        <Link to="/liquidation">Liquidation</Link>
        <Link to="/redemption">Redemption</Link>
      </Flex>
      <Flex sx={{ alignItems: "center", flexDirection: ["column", "row"] }}>
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
    </Container>
  );
};
