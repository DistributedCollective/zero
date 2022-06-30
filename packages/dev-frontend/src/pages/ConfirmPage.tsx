import React, { useCallback, useEffect, useState } from "react";
import { Box, Image, Heading, Paragraph, Link } from "theme-ui";
import { useLocation } from "react-router-dom";
import { confirmUser } from "../utils/whitelist";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { isMainnet } from "../utils";

export const ConfirmPage: React.FC = () => {
  const [loaded, setLoaded] = useState(false);

  const location = useLocation();

  const refresh = useCallback(() => {
    window.location.href = process.env.PUBLIC_URL + "/zero";
  }, []);

  const checkParams = useCallback(async () => {
    const params = new URLSearchParams(location.search);

    const ref = params.get("ref") || "";

    if (!ref) {
      return refresh();
    }
    try {
      await confirmUser(ref);
      setLoaded(true);
    } catch (error) {
      refresh();
    }
  }, [location.search, refresh]);

  useEffect(() => {
    checkParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) return <LoadingOverlay />;

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
      <Image
        sx={{
          mb: 60
        }}
        src={process.env.PUBLIC_URL + "/zero-logo.svg"}
      />
      <Link href={`https://${!isMainnet ? "test" : "live"}.sovryn.app/`}>
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
          mb: 20,
          fontSize: 36,
          fontWeight: 300,
          width: 370
        }}
      >
        Thank you!
      </Heading>
      <Paragraph sx={{ fontSize: 3 }}>
        Your email address has been confirmed and added to the Zero {isMainnet ? "" : "testnet"}{" "}
        waitlist.
      </Paragraph>
      <Link
        sx={{
          fontSize: 4,
          color: "primary",
          cursor: "pointer",
          fontWeight: "medium",
          mt: 2
        }}
        href={`https://${!isMainnet ? "test" : "live"}.sovryn.app/`}
      >
        Back to Sovryn
      </Link>
    </Box>
  );
};
