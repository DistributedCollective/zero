import { Box, Flex, Text } from "theme-ui";

import { Icon } from "./Icon";

export const ActionDescription: React.FC = ({ children }) => (
  <Box
    sx={{
      display: "flex",
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
);

export const Amount: React.FC = ({ children }) => (
  <Text sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>{children}</Text>
);
