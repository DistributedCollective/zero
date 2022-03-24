import { Container } from "theme-ui";

import { Trove } from "../components/Trove/Trove";
import { Stability } from "../components/Stability/Stability";
import { SystemStats } from "../components/SystemStats";
import { PriceManager } from "../components/PriceManager";

export const Dashboard: React.FC = () => (
  <Container variant="columns">
    <Container variant="leftDashboard">
      <Trove />
      <Stability />
    </Container>

    <Container variant="rightDashboard">
      <SystemStats />
      <PriceManager />
    </Container>
  </Container>
);
