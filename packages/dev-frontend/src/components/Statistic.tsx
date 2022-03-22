import React from "react";
import { Flex, Card } from "theme-ui";
import { InfoIcon } from "./InfoIcon";

type StatisticProps = {
  name: React.ReactNode;
  tooltip?: React.ReactNode;
};

export const Statistic: React.FC<StatisticProps> = ({ name, tooltip, children }) => {
  return (
    <Flex
      sx={{
        borderBottom: 1,
        borderColor: "rgba(232, 232, 232, 0.2)",
        color: "text",
        opacity: 0.75,
        fontSize: 12
      }}
    >
      <Flex
        sx={{
          alignItems: "center",
          justifyContent: "flex-start",
          flex: 1.2,
          fontWeight: 200,
          py: 1
        }}
      >
        <Flex>{name}</Flex>
        {tooltip && <InfoIcon size="xs" tooltip={<Card variant="tooltip">{tooltip}</Card>} />}
      </Flex>
      <Flex sx={{ justifyContent: "flex-end", alignItems: "center" }}>{children}</Flex>
    </Flex>
  );
};
