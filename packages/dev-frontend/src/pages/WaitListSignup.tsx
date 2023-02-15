import { useMemo, useRef } from "react";
import { useCallback } from "react";
import { useState } from "react";
import {
  Box,
  Heading,
  Image,
  Paragraph,
  Button,
  Input,
  Spinner,
  Link,
  Checkbox,
  Label
} from "theme-ui";
import { WaitlistSuccess } from "../components/WaitListSuccess";
import { Dialog } from "../components/Dialog";
import { validateEmail } from "../utils/helpers";
import { registerEmail } from "../utils/whitelist";
import { useLocation } from "react-router-dom";
import { sovrynLink } from "src/contracts/config";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { captchaSiteKey } from "src/utils";

export const WaitListSignup: React.FC = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");
  const [success, setSuccess] = useState(false);
  const [sovrynMail, setSovrylMail] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const captchaRef = useRef<HCaptcha>(null);

  const location = useLocation();

  const isValidEmail = useMemo(() => validateEmail(email), [email]);

  const resetStatus = useCallback(() => {
    if (!error && !success) return;
    setError("");
    setSuccess(false);
  }, [error, success]);

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
      
      if (!isValidEmail || !token) {
        return;
      }
      try {
        setIsLoading(true);
        await registerEmail(email, ref, sovrynMail, token);

        setEmail("");
        setError("");
        setSuccess(true);
        setIsLoading(false);
      } catch (error: any) {
        if (error?.response?.data?.message) {
          setError(error?.response?.data?.message);
        } else {
          setError("An error has occurred");
        }
        setIsLoading(false);
      }
      setToken("");
      captchaRef.current?.resetCaptcha();
    },
    [email, isValidEmail, location.search, resetStatus, sovrynMail, token]
  );

  const errorMessage = useMemo(() => {
    if (error) {
      return error;
    }
    if (email && !isValidEmail) {
      return "Please enter a valid email address.";
    }
    if (email && !token) {
      return "Please compelete recaptcha";
    }
    return null;
  }, [email, error, isValidEmail, token]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        height: "100%",
        width: "445px",
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
      <Link href={sovrynLink}>
        <Image
          sx={{
            position: "absolute",
            top: [20, 54],
            left: [20, 54]
          }}
          src={process.env.PUBLIC_URL + "/images/sovryn.svg"}
        />
      </Link>
      <Heading
        sx={{
          fontSize: 36,
          fontWeight: 300
        }}
      >
        Join the Zero waitlist
      </Heading>
      <Paragraph sx={{ fontSize: 3, mt: 16, mb: 24 }}>
        Get a 0% interest loan, backed by bitcoin.{" "}
        <Link
          sx={{
            fontSize: 3,
            color: "primary",
            cursor: "pointer",
            textDecoration: "underline",
            fontWeight: "medium"
          }}
          target="_blank"
          href="https://www.sovryn.app/blog/join-the-waitlist-for-zero"
        >
          Learn more.
        </Link>
      </Paragraph>
      <Paragraph sx={{ fontSize: 3, mb: 28 }}>
        Sign up and get notified when it’s <br />
        your turn to get early access to Zero.
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
              width: 285,
              mb: 20
            }}
            placeholder="satoshi@sovryn.app"
            variant="primary"
            value={email}
            onChange={handleEmailChange}
          />
          <Label
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              userSelect: "none",
              fontSize: 1,
              mb: 1
            }}
          >
            <Checkbox
              className="checkbox"
              checked={sovrynMail}
              onChange={e => setSovrylMail(e.target.checked)}
            />
            Add me to the general Sovryn mailing list
          </Label>

          <Box sx={{ my: 1 }}>
            <HCaptcha
              theme="dark"
              sitekey={captchaSiteKey || ""}
              onVerify={setToken}
              ref={captchaRef}
            />
          </Box>

          <Button
            sx={{
              width: 285,
              display: "flex",
              height: "40px",
              alignItems: "center"
            }}
            variant="secondary"
            disabled={!isValidEmail || isLoading || !token}
            data-action-id="zero-landing-signUp"
          >
            Sign Up
            {isLoading && <Spinner sx={{ ml: 1 }} color={"cardBackground"} size={24} />}
          </Button>
          {errorMessage && (
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
              {errorMessage}
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
          Or connect wallet if you have been invited to get early access to Zero
        </Paragraph>
        {children}
      </Box>
      <Dialog hideCloseIcon open={success} onClose={() => setSuccess(false)}>
        <WaitlistSuccess onClose={() => setSuccess(false)} />
      </Dialog>
    </Box>
  );
};
