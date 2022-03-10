import { Box, Heading, Image, Paragraph, Button } from "theme-ui";

export const WaitListSignup: React.FC = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "white",
      height: "100%",
      maxWidth: "377px",
      margin: "auto",
      textAlign: "center"
    }}
  >
    <Image
      sx={{
        mb: 60
      }}
      src="/zero-logo.svg"
    />
    <Heading
      sx={{
        mb: 60
      }}
    >
      Join the Zero waitlist
    </Heading>
    <Paragraph sx={{ fontSize: 2, mb: 40 }}>
      Sign up and get notified when it's your turn to access the Zero private beta.
    </Paragraph>
    <Button
      sx={{
        width: "284px",
        height: "40px",
        mt: 20,
        mb: 70
      }}
    >
      Sign Up
    </Button>
    <Box
      sx={{
        borderTop: 1,
        borderColor: "text",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "377px",
        opacity: "75%"
      }}
    >
      <Paragraph
        sx={{ fontSize: 2, mb: 30, mt: -14, bg: "background", width: "280px", fontWeight: 500 }}
      >
        Or connect wallet if you have been invited to the Zero private beta.
      </Paragraph>
      <Button
        sx={{
          width: "174px",
          height: "40px",
          p: 0
        }}
        disabled
      >
        Connect Wallet
      </Button>
    </Box>
  </Box>
);
