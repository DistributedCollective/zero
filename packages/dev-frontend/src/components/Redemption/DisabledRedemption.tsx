import { Box, Heading, Paragraph, Text } from "theme-ui";
import { Card } from "../Card";
import { InfoMessage } from "../InfoMessage";
import { Icon } from "../Icon";

type DisabledRedemptionProps = {
  disabledDays: number;
  unlockDate: Date;
};

export const DisabledRedemption: React.FC<DisabledRedemptionProps> = ({
  disabledDays,
  unlockDate
}) => (
  <Card
    heading={
      <>
        <Heading className="heading">Redeem</Heading>
      </>
    }
  >
    <Box sx={{ p: [2, 3] }}>
      <InfoMessage
        title="Redemption is not enabled yet."
        icon={
          <Box sx={{ color: "warning" }}>
            <Icon name="exclamation-triangle" />
          </Box>
        }
      >
        <Paragraph>
          ZUSD redemption is disabled for the first {disabledDays} days after launch.
        </Paragraph>

        <Paragraph sx={{ mt: 3 }}>
          It will be unlocked at{" "}
          <Text sx={{ fontWeight: "medium" }}>{unlockDate.toLocaleString()}</Text>.
        </Paragraph>
      </InfoMessage>
    </Box>
  </Card>
);
