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
        textAlign: "center",
        mt: [80, 80, 3],
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
        <Link to="/zero" data-action-id="zero-menu-dashboard">
          Dashboard
        </Link>
        <Link to="/zero/liquidation" data-action-id="zero-menu-liquidation">
          Liquidation
        </Link>
        <Link to="/zero/redemption" data-action-id="zero-menu-redemption">
          Redemption
        </Link>
      </Flex>
      <Flex sx={{ alignItems: "center", flexDirection: ["column", "row"] }}>
        <NavLink
          href="https://wiki.sovryn.app/en/sovryn-dapp/subprotocols/zero-zusd"
          target="_blank"
          data-action-id="zero-links-docs"
        >
          DOCS
        </NavLink>
        <NavLink
          href="https://live.sovryn.app/swap"
          target="_blank"
          data-action-id="zero-links-trade"
        >
          Trade
        </NavLink>
      </Flex>
    </Container>
  );
};
