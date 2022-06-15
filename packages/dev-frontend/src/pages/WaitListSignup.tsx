import { useMemo } from "react";
import { useCallback } from "react";
import { useState } from "react";
import { Box, Heading, Image, Paragraph, Button, Input, Spinner } from "theme-ui";
import { WaitlistSuccess } from "../components/WaitListSuccess";
import { Dialog } from "../components/Dialog";
import { validateEmail } from "../utils/helpers";
import { registerEmail } from "../utils/whitelist";
import { useLocation } from "react-router-dom";

export const WaitListSignup: React.FC = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");

  const location = useLocation();

  const isValidEmail = useMemo(() => validateEmail(email), [email]);

  const resetStatus = useCallback(() => {
    if (!errorMessage && !success) return;
    setErrorMessage("");
    setSuccess(false);
  }, [errorMessage, success]);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      resetStatus();
    },
    [resetStatus]
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const params = new URLSearchParams(location.search);

      const ref = params.get("r") || "";
      resetStatus();
      if (!isValidEmail) {
        return;
      }
      try {
        setIsLoading(true);
        await registerEmail(email, ref);

        setEmail("");
        setErrorMessage("");
        setSuccess(true);
        setIsLoading(false);
      } catch (error: any) {
        if (error?.response?.data?.message) {
          setErrorMessage(error?.response?.data?.message);
        } else {
          setErrorMessage("An error has occurred");
        }
        setIsLoading(false);
      }
    },
    [email, isValidEmail, location.search, resetStatus]
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        height: "100%",
        width: "384px",
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
        src={process.env.PUBLIC_URL + "/zero-logo.svg"}
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
        <form onSubmit={onSubmit}>
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
            onChange={handleEmailChange}
          />
          <Button
            sx={{
              width: 285,
              height: "40px",
              mt: 20,
              display: "flex",
              alignItems: "center"
            }}
            variant="secondary"
            disabled={!isValidEmail || isLoading}
          >
            Sign Up
            {isLoading && <Spinner sx={{ ml: 1 }} color={"cardBackground"} size={24} />}
          </Button>
          {((email && !isValidEmail) || errorMessage) && (
            <Paragraph
              sx={{
                fontSize: 1,
                fontWeight: 500,
                position: "absolute",
                bottom: -30,
                color: "danger",
                width: "385px",
                margin: "auto",
                left: -50,
                right: 0,
                textAlign: "center"
              }}
            >
              {errorMessage ? errorMessage : "Please enter a valid email address."}
            </Paragraph>
          )}
        </form>
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
          maxWidth: "100%"
        }}
      >
        <Paragraph
          sx={{
            fontSize: 1,
            fontWeight: 500,
            mb: 30,
            mt: -14,
            bg: "background",
            width: "280px"
          }}
        >
          Or connect wallet if you have been invited to the Zero private beta.
        </Paragraph>
        {children}
      </Box>
      <Dialog hideCloseIcon open={success} onClose={() => setSuccess(false)}>
        <WaitlistSuccess onClose={() => setSuccess(false)} />
      </Dialog>
    </Box>
  );
};
