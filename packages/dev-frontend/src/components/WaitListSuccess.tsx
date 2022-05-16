import React from "react";
import { Box, Image, Paragraph } from "theme-ui";

type WaitlistSuccessProps = {
  onClose: () => void;
};

export const WaitlistSuccess: React.FC<WaitlistSuccessProps> = ({ onClose }) => {
  return (
    <>
      <Image src="/success-mark.png" />
      <Box
        sx={{
          textAlign: "center",
          maxWidth: 435,
          mt: 20,
          mb: 30
        }}
      >
        <Paragraph sx={{ fontSize: 4, px: 4, fontWeight: "medium", wordBreak: "keep-all" }}>
          Check your email!
        </Paragraph>
        <br />
        <Paragraph sx={{ fontSize: 4, fontWeight: "medium", wordBreak: "keep-all" }}>
          We received your email address, now click the confirmation link we just emailed you to
          finish adding yourself to the waitlist.
        </Paragraph>
      </Box>
      <Paragraph
        sx={{
          fontSize: 4,
          color: "primary",
          cursor: "pointer",
          textDecoration: "underline",
          fontWeight: "medium"
        }}
        onClick={onClose}
      >
        Back to Sovryn
      </Paragraph>
    </>
  );
};
