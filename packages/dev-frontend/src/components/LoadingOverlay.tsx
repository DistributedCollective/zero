import React from "react";
import { Container, Spinner } from "theme-ui";

export const LoadingOverlay: React.FC = () => (
  <Container
    variant="disabledOverlay"
    sx={{ p: "14px", display: "flex", justifyContent: "center", alignItems: "center" }}
  >
    <Spinner size="40px" sx={{ color: "text" }} />
  </Container>
);
