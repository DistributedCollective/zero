import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Image, Heading, Paragraph, Input, Spinner, Button, NavLink } from "theme-ui";
import { activateAccount } from "../utils/whitelist";
import { useLocation } from "react-router-dom";
import { validateEmail } from "../utils/helpers";
import { Dialog } from "../components/Dialog";
import { WaitListAccessSuccess } from "../components/WaitListAccessSuccess";
import { isAddress } from "@ethersproject/address";

export const AccessPage: React.FC = () => {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [address, setAddress] = useState("");

  const location = useLocation();

  const isValidAddress = useMemo(() => !!address, [address]);

  const refresh = useCallback(() => {
    const origin = window.location.origin;
    window.location.href = origin;
  }, []);

  const checkParams = useCallback(async () => {
    const params = new URLSearchParams(location.search);

    const email = params.get("email") || "";
    const code = params.get("code") || "";

    if (!email || !code) {
      refresh();
    } else {
      setLoaded(true);
    }
  }, [location.search, refresh]);

  useEffect(() => {
    checkParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect(() => {
  //   if (account) setAddress(account);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      const params = new URLSearchParams(location.search);
      setErrorMessage("");
      setIsLoading(false);
      e.preventDefault();

      const email = params.get("email") || "";
      const code = params.get("code") || "";

      if (!isValidAddress || !code) {
        return;
      }
      if (!validateEmail(email)) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }

      if (!isAddress(address)) {
        setErrorMessage("Please enter a valid RSK address.");
        return;
      }

      try {
        setIsLoading(true);
        const { data } = await activateAccount(address, email, code);
        if (data.access) {
          setSuccess(true);
        }
      } catch (error: any) {
        if (error?.response?.data?.message) {
          setErrorMessage(error?.response?.data?.message);
        } else {
          setErrorMessage(
            "Unable to process request. Please try again later and contact the Sovryn Help Desk if you continue receiving this error message."
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [address, isValidAddress, location.search]
  );

  if (!loaded) return null;

  const getError = (error: string) => {
    switch (error) {
      case "emailNotFound":
        return (
          <div>
            Email address not on waitlist.{" "}
            <span style={{ cursor: "pointer" }} onClick={refresh}>
              Click here to sign up.
            </span>
          </div>
        );
      case "expired":
        return (
          <div>
            Invitation code expired. Connect your wallet or sign up for the waitlist
            <span style={{ cursor: "pointer" }} onClick={refresh}>
              {" "}
              here.
            </span>
          </div>
        );
      default:
        return error;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        height: "100%",
        width: "435px",
        maxWidth: "100vw",
        px: 2,
        margin: "auto",
        textAlign: "center"
      }}
    >
      <NavLink href="/">
        <Image
          sx={{
            mb: 60
          }}
          src={process.env.PUBLIC_URL + "/zero-logo.svg"}
        />
      </NavLink>
      <Heading
        sx={{
          mb: 60,
          fontSize: 36,
          fontWeight: 300,
          width: 370
        }}
      >
        Welcome to the Zero private beta
      </Heading>
      <Paragraph sx={{ fontSize: 3, mb: 20 }}>
        Confirm the RSK address you want to use with Zero:
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
              width: 366,
              mx: "auto",
              height: 32
            }}
            placeholder="RSK address"
            variant="primary"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
          <Button
            sx={{
              mt: 20,
              display: "flex",
              alignItems: "center",
              mx: "auto",
              height: 32
            }}
            variant="secondary"
            disabled={!isValidAddress || isLoading}
          >
            Confirm
            {isLoading && <Spinner sx={{ ml: 1 }} color={"cardBackground"} size={24} />}
          </Button>

          <Paragraph
            sx={{
              fontSize: 1,
              fontWeight: 500,
              color: "danger",
              margin: "auto",
              textAlign: "center",
              mt: 10,
              minHeight: 30,
              visibility: errorMessage ? "visible" : "hidden"
            }}
          >
            {getError(errorMessage)}
          </Paragraph>

          {/* <Button
              sx={{
                fontSize: 2,
                display: "flex",
                alignItems: "center",
                mx: "auto",
                height: 32,
                mt: 2
              }}
              onClick={refresh}
            >
              Go to landing page
            </Button> */}
        </form>
      </Box>
      <Dialog hideCloseIcon disableClose open={success} onClose={() => setSuccess(false)}>
        <WaitListAccessSuccess refresh={refresh} />
      </Dialog>
    </Box>
  );
};
