import { Theme, ThemeUIStyleObject } from "theme-ui";

const baseColors = {
  transparent: "transparent",
  current: "currentColor",

  primary: "#fec004",
  "primary-75": "#fec004C0",
  "primary-50": "#fec00480",
  "primary-25": "#fec00440",
  "primary-10": "#fec0041a",

  secondary: "#2274a5",
  "secondary-75": "#2274a5C0",
  "secondary-50": "#2274a580",
  "secondary-25": "#2274a540",
  "secondary-10": "#2274a51a",

  black: "#000000",
  "gray-1": "#161616",
  "gray-2": "#1f1f1f",
  "gray-3": "#2c2c2c",
  "gray-4": "#343434",
  "gray-5": "#484848",
  "gray-6": "#5c5c5c",
  "gray-7": "#909090",
  "gray-8": "#a2a2a2",
  "gray-9": "#c4c4c4",
  "sov-white": "#e8e8e8",
  "sov-white2": "#EAEAEA",
  white: "#ffffff",

  "trade-long": "#17C3B2",
  "trade-long-75": "#17C3B2C0",
  "trade-long-50": "#17C3B280",
  "trade-long-25": "#17C3B240",
  "trade-long-10": "#17C3B21a",
  "trade-short": "#D74E09",
  "trade-short-75": "#D74E09C0",
  "trade-short-50": "#D74E0980",
  "trade-short-25": "#D74E0940",
  "trade-short-10": "#D74E091a",

  success: "#27A522",
  "success-75": "#27A522C0",
  "success-50": "#27A52280",
  "success-25": "#27A52240",
  "success-10": "#27A5221a",
  warning: "#A52222",
  "warning-75": "#A52222C0",
  "warning-50": "#A5222280",
  "warning-25": "#A5222240",
  "warning-10": "#A522221a",

  "yellow-1": "#F5E884",
  "yellow-2": "#DEB258",
  "blue-1": "#8EDBDB",
  "blue-2": "#628CB5",
  "orange-1": "#F7B199",
  "orange-2": "#DB6E4D",
  "green-1": "#95CA8F",
  "green-2": "#5AA897",
  "purple-1": "#8F91C3",
  "purple-2": "#7E64A7",
  "pink-1": "#C38FBB",
  "pink-2": "#A264A7"
};

const colors = {
  primary: baseColors.primary,
  secondary: baseColors.secondary,
  accent: baseColors.primary,
  success: baseColors["blue-1"],
  warning: baseColors.primary,
  danger: baseColors.warning,
  dangerHover: baseColors["orange-2"],
  info: baseColors["blue-1"],
  invalid: baseColors["pink-1"],
  text: baseColors["sov-white"],
  background: baseColors["gray-1"],
  cardBackground: baseColors.black,
  muted: baseColors["sov-white"],
  bonded: baseColors["gray-6"],
  highlight: baseColors["gray-6"],
  darkGray: baseColors["gray-8"],
  darkGray2: baseColors["gray-7"]
};

const zeroCardColors = {
  heading: "#2D2D2D",
  subheading: "rgba(237, 237, 237, 0.75)",
  content: "#222222"
};

const buttonBase: ThemeUIStyleObject = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  ":enabled": { cursor: "pointer" }
};

const button: ThemeUIStyleObject = {
  ...buttonBase,

  px: "2rem",
  py: "0.375rem",

  color: colors.primary,
  border: 1,
  borderColor: colors.primary,
  backgroundColor: "transparent",

  borderRadius: "8px",

  ":disabled": {
    opacity: 0.5
  }
};

const buttonOutline = (color: string, hoverColor: string): ThemeUIStyleObject => ({
  color,
  borderColor: color,
  background: "none",

  ":enabled:hover": {
    color: hoverColor,
    borderColor: hoverColor
  }
});

const iconButton: ThemeUIStyleObject = {
  ...buttonBase,

  padding: 0,
  width: "40px",
  height: "40px",

  background: "none",

  ":disabled": {
    color: "text",
    opacity: 0.25
  }
};

const cardHeadingFontSize = 18.7167;
const cardSubHeadingFontSize = 16;

const cardGapX = [0, 3, 4];
const cardGapY = [3, 3, 4];

const card: ThemeUIStyleObject = {
  position: "relative",
  mt: cardGapY,
  boxShadow: [1, null, 2],
  borderRadius: 10,
  height: "225px"
};

const infoCard: ThemeUIStyleObject = {
  ...card,

  padding: 3,
  borderColor: "rgba(122,199,240,0.4)",
  background: `linear-gradient(200deg, #26899b, #030c0d)`,

  h2: {
    mb: 2,
    fontSize: cardHeadingFontSize
  }
};

const formBase: ThemeUIStyleObject = {
  display: "block",
  width: "auto",
  flexShrink: 0,
  padding: 2,
  fontSize: 3
};

const formCell: ThemeUIStyleObject = {
  ...formBase,

  bg: "background",
  border: 1,
  borderColor: "muted",
  borderRadius: 0,
  boxShadow: [1, 2]
};

const overlay: ThemeUIStyleObject = {
  position: "absolute",

  left: 0,
  top: 0,
  width: "100%",
  height: "100%"
};

const modalOverlay: ThemeUIStyleObject = {
  position: "fixed",

  left: 0,
  top: 0,
  width: "100vw",
  height: "100vh"
};

const headerGradient: ThemeUIStyleObject = {
  background: colors.cardBackground
};

const theme: Theme = {
  breakpoints: ["576px", "768px", "992px", "1200px", "1536px", "1854px"],

  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],

  fonts: {
    body: '"Montserrat", "sans-serif"',
    heading: '"Montserrat", "sans-serif"',
    monospace: "Menlo, monospace"
  },

  fontSizes: [
    "0.625rem",
    "0.75rem",
    "0.875rem",
    "1rem",
    "1.125rem",
    "1.25rem",
    "1.5rem",
    "1.75rem",
    "2.5rem",
    "3.25rem"
  ], // [10px, 12px, 14px, 16px, 18px, 20px, 24px, 28px, 40px, 52px]

  fontWeights: {
    body: 400,
    heading: 600,

    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },

  lineHeights: {
    body: 1.5,
    heading: 1.25,

    "leading-4": "1rem",
    "leading-3": "0.75rem",
    "leading-5": "1.25rem",
    "leading-6": "1.5rem",
    "leading-7": "1.75rem",
    "leading-8": "2rem",
    "leading-9": "2.25rem",
    "leading-10": "2.5rem",
    "leading-none": 1,
    "leading-tight": 1.25,
    "leading-snug": 1.375,
    "leading-normal": 1.5,
    "leading-relaxed": 1.625,
    "leading-loose": 2
  },

  letterSpacings: {
    "tracking-normal": 0,
    "tracking-wide": "0.025em",
    "tracking-wider": "0.05em",
    "tracking-widest": "0.1em"
  },

  colors,

  borders: [0, "1px solid", "2px solid"],

  shadows: ["0", "0px 4px 8px rgba(41, 49, 71, 0.1)", "0px 8px 16px rgba(41, 49, 71, 0.1)"],

  text: {
    address: {
      fontFamily: "Montserrat",
      fontSize: 1
    }
  },

  buttons: {
    primary: {
      ...button,

      ":enabled:hover": {
        opacity: 0.75
      }
    },

    outline: {
      ...button,
      ...buttonOutline("primary", "secondary")
    },

    cancel: {
      ...button,

      color: "#ededed",
      borderColor: "#ededed",

      ":enabled:hover": {
        opacity: 0.75
      }
    },

    danger: {
      ...button,

      bg: "danger",
      borderColor: "danger",

      ":enabled:hover": {
        bg: "dangerHover",
        borderColor: "dangerHover"
      }
    },

    icon: {
      ...iconButton,
      color: "primary",
      ":enabled:hover": { color: "accent" }
    },

    dangerIcon: {
      ...iconButton,
      color: "danger",
      ":enabled:hover": { color: "dangerHover" }
    },

    titleIcon: {
      ...iconButton,
      color: "text",
      ":enabled:hover": { color: "success" }
    }
  },

  cards: {
    primary: {
      ...card,

      padding: 0,
      bg: zeroCardColors.content,

      ".subheading": {
        fontSize: cardSubHeadingFontSize,
        color: zeroCardColors.subheading
      },

      ".heading": {
        color: "text",
        fontSize: cardHeadingFontSize
      },

      "> .heading-wrapper": {
        display: "flex",
        borderRadius: "10px 10px 0px 0px",
        flexDirection: "column",
        px: 3,
        py: 3,

        bg: zeroCardColors.heading
      }
    },

    info: {
      ...infoCard,

      display: ["none", "block"]
    },

    infoPopup: {
      ...infoCard,

      position: "fixed",
      top: 0,
      right: 3,
      left: 3,
      mt: "72px",
      height: "80%",
      overflowY: "scroll"
    },

    tooltip: {
      padding: 2,

      border: 1,
      borderColor: "muted",
      borderRadius: "4px",
      bg: "background",
      boxShadow: 2,

      fontSize: 1,
      color: "text",
      fontWeight: "body",
      zIndex: 1
    }
  },

  forms: {
    label: {
      ...formBase
    },

    unit: {
      ...formCell,

      textAlign: "center",
      bg: "muted"
    },

    input: {
      ...formCell,

      flex: 1
    },

    editor: {}
  },

  layout: {
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",

      position: ["fixed", "relative"],
      width: "100vw",
      top: 0,
      zIndex: 1,

      px: ["10px", "20px", "20px", "30px"],
      py: "12px",

      background: baseColors["sov-white2"],
      color: baseColors.black
    },

    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      mt: cardGapY,
      px: 3,
      minHeight: "72px",

      bg: "muted"
    },

    main: {
      width: "100vw",
      maxWidth: "1248px",
      mx: "auto"
    },

    columns: {
      display: "flex",
      flexWrap: "wrap",
      justifyItems: "center"
    },

    left: {
      pr: cardGapX,
      width: ["100%", "58%"]
    },

    right: {
      width: ["100%", "42%"]
    },

    actions: {
      justifyContent: "space-between",
      mt: 2,

      button: {
        ml: 2
      }
    },

    disabledOverlay: {
      ...overlay,

      bg: "rgba(255, 255, 255, 0.5)"
    },

    modalOverlay: {
      ...modalOverlay,

      bg: "rgba(0, 0, 0, 0.8)",

      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    },

    modal: {
      padding: 3,
      width: ["100%", "40em"]
    },

    infoOverlay: {
      ...modalOverlay,

      display: ["block", "none"],

      bg: "rgba(255, 255, 255, 0.8)"
    },

    infoMessage: {
      display: "flex",
      justifyContent: "center",
      m: 3,
      alignItems: "center",
      minWidth: "128px"
    },

    sidenav: {
      display: ["flex", "none"],
      flexDirection: "column",
      p: 0,
      m: 0,
      borderColor: "muted",
      mr: "25vw",
      height: "100%",
      ...headerGradient
    },

    badge: {
      border: 0,
      borderRadius: 3,
      p: 1,
      px: 2,
      backgroundColor: "muted",
      color: "slate",
      fontSize: 1,
      fontWeight: "body"
    }
  },

  styles: {
    root: {
      fontFamily: "body",
      lineHeight: "body",
      fontWeight: "body",

      height: "100%",

      "#root": {
        height: "100%"
      }
    },

    a: {
      color: "primary",
      ":hover": { color: "accent" },
      textDecoration: "none",
      fontWeight: "bold"
    }
  },

  links: {
    nav: {
      px: 2,
      py: 1,
      fontWeight: "medium",
      fontSize: 2,
      textTransform: "uppercase",
      letterSpacing: "2px",
      width: ["100%", "auto"]
    }
  }
};

export default theme;
