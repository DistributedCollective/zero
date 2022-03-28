import { Box, Flex, Text } from "theme-ui";

import { Icon } from "./Icon";

export const ActionDescription: React.FC = ({ children }) => (
  <Box
    sx={{
      mx: "150px",
      mb: "20px",
      mt: "50px",
      py: 3,
      px:25,

      border: 1,
      borderRadius: "10px",
      borderColor: "primary",
      color:"primary",
      width:"65%"
    }}
  >
    <Flex sx={{ alignSelf: "center" }}>
      <Icon name="info-circle" size="lg" />
      <Text sx={{ ml: 2 }}>{children}</Text>
    </Flex>
  </Box>
);

export const Amount: React.FC = ({ children }) => (
  <Text sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>{children}</Text>
);
