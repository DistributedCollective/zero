import React, { useEffect, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import { Box, Card, ThemeUIStyleObject } from "theme-ui";
import { useOnClickOutside } from "../hooks/useOnClickOutside";

interface Props {
  className?: string;
  wrapperClass?: string;
  open: boolean;
  onClose?: () => void;
  onExited?: () => void;
  children?: React.ReactNode;
  disableClose?: boolean;
  hideCloseIcon?: boolean;
  sx?: ThemeUIStyleObject;
}

export const Dialog: React.FC<Props> = ({
  className,
  open,
  onClose,
  onExited,
  children,
  disableClose,
  sx
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => !disableClose && onClose?.());

  useEffect(() => {
    if (open) document.documentElement.classList.add("stop-scrolling");
    else document.documentElement.classList.remove("stop-scrolling");
  }, [open]);
  const nodeRef = useRef(null);

  return (
    <CSSTransition
      unmountOnExit
      classNames="dialog"
      nodeRef={nodeRef}
      in={open}
      timeout={{ enter: 500, exit: 300 }}
    >
      <Box
        className={className}
        ref={nodeRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "fixed",
          width: "100vw",
          height: "100vh",
          bg: "rgba(22,22,22,0.85)",
          top: 0,
          left: 0,
          zIndex: 99
        }}
      >
        <Card
          variant="info"
          sx={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            wordBreak: "break-all",
            ...sx
          }}
        >
          {children}
        </Card>
      </Box>
    </CSSTransition>
  );
};
