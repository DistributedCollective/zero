import React, { ReactNode } from "react";
import { Card as ThemeUICard, Box } from "theme-ui";

interface CardProps {
  heading?: ReactNode;
  children: ReactNode;
}
//TODO: make props interface: heading,children

export const Card: React.FC<CardProps> = ({ heading, children }) => {
  return (
    <ThemeUICard>
      {heading && <div className="heading-wrapper">{heading}</div>}
      <Box sx={{ paddingTop: "72px", paddingLeft: "31px", paddingRight: "41px" }}>{children}</Box>
    </ThemeUICard>
  );
};
