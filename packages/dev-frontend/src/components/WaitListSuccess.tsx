import React from "react";
import { Box, Card, Image, Paragraph } from "theme-ui";

type WaitListSuccessProps = {
  onClose: () => void;
};

export const WaitListSuccess: React.FC<WaitListSuccessProps> = ({ onClose }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "fixed",
        width: "100vw",
        height: "100vh",
        bg: "rgba(22,22,22,0.85)",
        top: 0,
        left: 0,
        zIndex: 99
      }}
    >
      <Card variant="info">
        <Image src="/success-mark.png" />
        <Box
          sx={{
            textAlign: "center",
            maxWidth: 435,
            mt: 20,
            mb: 30
          }}
        >
          <Paragraph sx={{ fontSize: 2, px: 4 }}>
            Thank you for signing up for the Zero private beta waitlist!
          </Paragraph>
          <br />
          <Paragraph sx={{ fontSize: 2 }}>
            You will receive an email soon with details about what happens next.
          </Paragraph>
        </Box>
        <Paragraph
          sx={{ fontSize: 2, color: "primary", cursor: "pointer", textDecoration: "underline" }}
          onClick={onClose}
        >
          Back to Sovryn
        </Paragraph>
      </Card>
    </Box>
  );
};
