import React, { ReactNode } from "react";
import { Card as ThemeUICard, Box } from "theme-ui";

interface CardProps {
  heading?: ReactNode;
  children: ReactNode;
}

export const Card: React.FC<CardProps> = ({ heading, children }) => {
  return (
    <ThemeUICard>
      {heading && <div className="heading-wrapper">{heading}</div>}
      <Box sx={{ px: "40px", py: "20px" }}>{children}</Box>
    </ThemeUICard>
  );
};
