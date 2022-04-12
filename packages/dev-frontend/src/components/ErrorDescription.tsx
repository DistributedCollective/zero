import { Box, Flex, Text } from "theme-ui";

import { Icon } from "./Icon";

export const ErrorDescription: React.FC = ({ children }) => (
  <Box sx={{ width: "100%", textAlign: "center" }}>
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        justifyContent: "space-around",

        mb: [2, 3],
        py: 2,
        px: 4,

        border: 1,
        borderRadius: "8px",
        borderColor: "danger",
        color: "danger",
        boxShadow: 2,
        "& svg": {
          color: "danger"
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
