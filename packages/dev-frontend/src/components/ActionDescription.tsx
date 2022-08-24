import { Decimal } from "@sovryn-zero/lib-base";
import Tippy from "@tippyjs/react";
import { useMemo } from "react";
import { Box, Card, Flex, Text, ThemeUIStyleObject } from "theme-ui";

import { Icon } from "./Icon";

export const ActionDescription: React.FC = ({ children }) => (
  <Box sx={{ width: "100%", textAlign: "center" }}>
    <Box
      sx={{
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",

        mb: [2, 3],
        py: 2,
        px: 4,

        border: 1,
        borderRadius: "10px",
        borderColor: "primary",
        boxShadow: 2,
        bg: "transparent",
        color: "primary",
        textAlign: "center",
        "& svg": {
          color: "primary"
        }
      }}
    >
      <Flex sx={{ alignItems: "center" }}>
        <Icon name="info-circle" size="sm" />
        <Text sx={{ ml: 2, fontSize: 2, fontWeight: 300, fontStyle: "italic" }}>{children}</Text>
      </Flex>
    </Box>
  </Box>
);

interface AmountProps {
  value?: Decimal;
  sx?: ThemeUIStyleObject;
}
export const Amount: React.FC<AmountProps> = ({
  children,
  value,
  sx = { fontWeight: "bold", whiteSpace: "nowrap" }
}) => {
  const showTilde = useMemo(() => value && !Decimal.from(value.toString(2)).eq(value), [value]);
  return (
    <Tippy
      interactive={true}
      disabled={!showTilde}
      content={<Card variant="tooltip">{value?.toString()}</Card>}
    >
      <Text sx={sx}>
        {showTilde && <Text sx={{ fontWeight: "light", opacity: 0.8, flexShrink: 0 }}>~&nbsp;</Text>}
        {children}
      </Text>
    </Tippy>
  );
};
