import { Box, Flex, Text } from "theme-ui";

import { Icon } from "./Icon";

export const ActionDescription: React.FC = ({ children }) => (
  <Box
    sx={{
      mb: "20px",
      py: 3,
      px: 25,

      border: 1,
      borderRadius: "10px",
      borderColor: "primary",
      color: "primary",
      width: "100%",
      textAlign: "center"
    }}
  >
    <Icon name="info-circle" size="lg" />
    <Text sx={{ ml: 2, fontSize: 14 }}>{children}</Text>
  </Box>
);

export const Amount: React.FC = ({ children }) => (
  <Text sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>{children}</Text>
);
