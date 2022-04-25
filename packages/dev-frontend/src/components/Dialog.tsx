import React, { useEffect, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import { Box, Card, ThemeUIStyleObject, Image } from "theme-ui";
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
  children,
  disableClose,
  hideCloseIcon,
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
            zth: "100vw",
            maxHeight: "100vh",
            wordBreak: "break-all",
            position: "relative",
            ...sx
          }}
          ref={ref}
        >
          {!hideCloseIcon && (
            <Box
              sx={{
                borderRadius: "50%",
                width: 40,
                height: 40,
                border: "2px solid #a2a2a2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "absolute",
                ":hover": {
                  bg: "#353535"
                },
                right: 0,
                top: 0,
                userSelect: "none",
                cursor: "pointer",
                transform: "translate(34px, -34px)"
              }}
              onClick={onClose}
            >
              <Image src="/images/x.svg" alt="x" sx={{ width: 18 }} />
            </Box>
          )}
          {children}
        </Card>
      </Box>
    </CSSTransition>
  );
};
