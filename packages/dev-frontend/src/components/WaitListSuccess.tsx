import React, { useRef } from "react";
import { Box, Card, Image, Paragraph } from "theme-ui";
import { CSSTransition } from "react-transition-group";

type WaitlistSuccessProps = {
  onClose: () => void;
  open: boolean;
};

export const WaitlistSuccess: React.FC<WaitlistSuccessProps> = ({ onClose, open }) => {
  const nodeRef = useRef(null);

  return (
    <CSSTransition
      unmountOnExit
      classNames="dialog"
      nodeRef={nodeRef}
      in={open}
      timeout={{ enter: 500, exit: 300 }}
    >
      <Box
        ref={nodeRef}
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
            <Paragraph sx={{ fontSize: 4, px: 4, fontWeight: "medium" }}>
              Thank you for signing up for the Zero private beta waitlist!
            </Paragraph>
            <br />
            <Paragraph sx={{ fontSize: 4, fontWeight: "medium" }}>
              You will receive an email soon with details about what happens next.
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
        </Card>
      </Box>
    </CSSTransition>
  );
};
