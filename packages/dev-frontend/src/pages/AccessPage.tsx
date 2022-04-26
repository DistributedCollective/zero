import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Image, Heading, Paragraph, Input, Spinner, Button, NavLink } from "theme-ui";
import { activateAccount } from "../utils/whitelist";
import { useLocation } from "react-router-dom";
import { validateEmail } from "../utils/helpers";
import { Dialog } from "../components/Dialog";
import { WaitListAccessSuccess } from "../components/WaitListAccessSuccess";
import { useWeb3React } from "@web3-react/core";
import { isAddress } from "@ethersproject/address";

export const AccessPage: React.FC = () => {
  const { account } = useWeb3React();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [address, setAddress] = useState("");

  const location = useLocation();

  const isValidAddress = useMemo(() => !!address, [address]);

  useEffect(() => {
    if (account) setAddress(account);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      const params = new URLSearchParams(location.search);
      setErrorMessage("");
      setShowRefresh(false);
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
        if (error?.response?.status === 409) {
          setShowRefresh(true);
        }
        if (error?.response?.data?.message) {
          setErrorMessage(error?.response?.data?.message);
        } else {
          setErrorMessage("An error has occurred");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [address, isValidAddress, location.search]
  );

  const refresh = useCallback(() => {
    const origin = window.location.origin;
    window.location.href = origin;
  }, []);

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
          src="/zero-logo.svg"
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
            {errorMessage}
          </Paragraph>

          {showRefresh && (
            <Button
              sx={{
                fontSize: 2,
                display: "flex",
                alignItems: "center",
                mx: "auto",
                height: 32
              }}
              onClick={refresh}
            >
              Go to landing page
            </Button>
          )}
        </form>
      </Box>
      <Dialog hideCloseIcon disableClose open={success} onClose={() => setSuccess(false)}>
        <WaitListAccessSuccess refresh={refresh} />
      </Dialog>
    </Box>
  );
};
