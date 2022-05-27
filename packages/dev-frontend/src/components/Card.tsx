import React, { ReactNode } from "react";
import { Card as ThemeUICard, Box, ThemeUIStyleObject } from "theme-ui";

interface CardProps {
  heading?: ReactNode;
  children: ReactNode;
  sx?: ThemeUIStyleObject;
}

export const Card: React.FC<CardProps> = ({ heading, sx, children }) => {
  return (
    <ThemeUICard sx={sx}>
      {heading && <div className="heading-wrapper">{heading}</div>}
      <Box sx={{ p: 20 }}>{children}</Box>
    </ThemeUICard>
  );
};
