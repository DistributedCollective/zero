import React, { ReactNode } from "react";
import { Card as ThemeUICard, Box, Flex, Button, Text } from "theme-ui";

interface CardProps {
  heading?: ReactNode;
  children: ReactNode;
}
//TODO: make props interface: heading,children

export const Card: React.FC<CardProps> = ({ heading, children }) => {
  return (
    <ThemeUICard>
      {heading && <div className="heading-wrapper">{heading}</div>}
      {/* <Heading>Line of Credit</Heading>
      <Heading as="h3" sx={{fontWeight:"light"}}>You can borrow ZUSD by opening a Line of Credit.</Heading> */}
      <Box sx={{ paddingTop: "72px", paddingLeft: "31px", paddingRight: "41px" }}>{children}</Box>
    </ThemeUICard>
  );
};
