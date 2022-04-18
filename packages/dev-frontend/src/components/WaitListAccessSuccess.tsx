import React, { useCallback } from "react";
import { Box, Button, Image, Paragraph } from "theme-ui";

export const WaitListAccessSuccess: React.FC = () => {
  const refresh = useCallback(() => {
    const origin = window.location.origin;
    window.location.href = origin;
  }, []);

  return (
    <>
      <Image src="/success-mark.png" />
      <Box
        sx={{
          textAlign: "center",
          maxWidth: 535,
          mb: 30,
          wordBreak: "keep-all"
        }}
      >
        <Paragraph sx={{ mb: 20, mt: 0, fontSize: 6 }}>Success!</Paragraph>
        <Paragraph sx={{ fontSize: 3, px: 2, fontWeight: "light" }}>
          Your RSK address has been added to the Zero private beta.
        </Paragraph>
        <br />
        <Box
          sx={{
            maxWidth: 340,
            margin: "auto"
          }}
        >
          <Paragraph sx={{ fontSize: 3, fontWeight: "light" }}>
            Click below to go to the landing page, then connect your wallet to access Zero:
          </Paragraph>
        </Box>
      </Box>

      <Button
        sx={{
          fontSize: 3,
          my: 16,
          bg: "primary",
          color: "cardBackground",
          "&: hover": {
            color: "primary"
          },
          display: "flex",
          alignItems: "center",
          mx: "auto",
          height: 32,
          fontWeight: 600
        }}
        onClick={refresh}
      >
        Go to landing page
      </Button>
    </>
  );
};
