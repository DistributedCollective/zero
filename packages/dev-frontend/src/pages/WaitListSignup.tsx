import { useMemo } from "react";
import { useCallback } from "react";
import { useState } from "react";
import { Box, Heading, Image, Paragraph, Button, Input } from "theme-ui";
import { WaitListSuccess } from "../components/WaitListSuccess";
import { validateEmail } from "../utils/helpers";

export const WaitListSignup: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const emailIsValid = useMemo(() => validateEmail(email), [email]);

  const signup = useCallback(() => {
    if (!emailIsValid) {
      return;
    }

    setSuccess(true);
    // if (window?.prefinery) {
    //   window.prefinery("addUser", email, function (user: any) {
    //     console.log("User: " + JSON.stringify(user));
    //   });
    // }
  }, [emailIsValid]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        height: "100%",
        width: "377px",
        maxWidth: "100vw",
        px: 2,
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
          mb: 60,
          fontSize: 36,
          fontWeight: 300
        }}
      >
        Join the Zero waitlist
      </Heading>
      <Paragraph sx={{ fontSize: 2, mb: 40 }}>
        Sign up and get notified when it's your turn to access the Zero private beta.
      </Paragraph>
      <Box sx={{ position: "relative", mb: 70 }}>
        <Input
          sx={{
            borderRadius: 8,
            outline: "none",
            color: "cardBackground",
            borderColor: "#ededed",
            bg: "#C4C4C4",
            width: 285
          }}
          placeholder="satoshin@gmx.com"
          variant="primary"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Button
          sx={{
            width: 285,
            height: "40px",
            mt: 20,
            bg: "primary",
            color: "cardBackground"
          }}
          onClick={signup}
          disabled={!emailIsValid}
        >
          Sign Up
        </Button>
        {email && !emailIsValid && (
          <Paragraph
            sx={{
              fontSize: 2,
              fontWeight: 500,
              position: "absolute",
              bottom: -30,
              color: "danger",
              width: "100%",
              textAlign: "center"
            }}
          >
            Please enter a valid email address.
          </Paragraph>
        )}
      </Box>

      <Box
        sx={{
          borderTop: 1,
          borderColor: "text",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "377px",
          maxWidth: "100%",
          opacity: "50%"
        }}
      >
        <Paragraph
          sx={{
            fontSize: 2,
            fontWeight: 500,
            mb: 30,
            mt: -14,
            bg: "background",
            width: "280px"
          }}
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
      {success && <WaitListSuccess onClose={() => setSuccess(false)} />}
    </Box>
  );
};
