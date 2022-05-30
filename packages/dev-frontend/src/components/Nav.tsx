import { Flex, NavLink, Image, Container } from "theme-ui";
import { Link } from "./Link";

export const Nav: React.FC = () => {
  return (
    <Container
      variant="main"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mt: 3,
        pb: 0,
        flexDirection: ["column", "column", "row"]
      }}
    >
      <Flex sx={{ alignItems: "center", flexDirection: ["column", "row"] }}>
        <Image
          sx={{ height: 40, pr: 20 }}
          src={process.env.PUBLIC_URL + "/images/zerologo.svg"}
          alt="Zero"
        />
        <Link to="/zero">Dashboard</Link>
        <Link to="/zero/liquidation">Liquidation</Link>
        <Link to="/zero/redemption">Redemption</Link>
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
