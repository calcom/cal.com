import { Variants, MotionStyle } from "framer-motion";

import { BookerLayout, BookerState } from "./types";

// Why any? :( -> https://www.framer.com/motion/component/#%23%23animating-css-variables)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MotionStyleWithCssVar = any;

export const MONTH_QUERY_PARAM = "month";

export const fadeInLeft = {
  variants: {
    visible: { opacity: 1, x: 0 },
    hidden: { opacity: 0, x: 20 },
  },
  initial: "hidden",
  exit: "hidden",
  animate: "visible",
  transition: { ease: "easeInOut", delay: 0.1 },
};
export const fadeInUp = {
  variants: {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: 20 },
  },
  initial: "hidden",
  exit: "hidden",
  animate: "visible",
  transition: { ease: "easeInOut", delay: 0.1 },
};

type ResizeAnimationConfig = {
  [key in BookerLayout]: {
    [key in BookerState]?: {
      variants: Variants;
    } & {
      style?: MotionStyleWithCssVar;
    };
  };
};

export const resizeAnimationConfig: ResizeAnimationConfig = {
  mobile: {
    variants: {
      default: {
        gridTemplateAreas: `
          "meta"
          "calendar"
          "main"
          "timeslots"
        `,
        gridTemplateColumns: "1fr",
      },
    },
  },
  small_calendar: {
    style: {
      "--booker-meta-width": "280px",
      "--booker-main-width": "425px",
      "--booker-timeslots-width": "280px",
      width: "calc(var(--booker-meta-width) + var(--booker-main-width))",
    },
    variants: {
      default: {
        width: "calc(var(--booker-meta-width) + var(--booker-main-width))",
        gridTemplateAreas: `
          "meta main"
        `,
        gridTemplateColumns: "var(--booker-meta-width) var(--booker-main-width)",
      },
      selecting_time: {
        width: "calc(var(--booker-meta-width) + var(--booker-main-width) + var(--booker-timeslots-width))",
        gridTemplateAreas: `
          "meta main timeslots"
        `,
        gridTemplateColumns:
          "var(--booker-meta-width) var(--booker-main-width) var(--booker-timeslots-width)",
      },
    },
  },
  large_calendar: {
    variants: {
      default: {
        width: "100vw",
        gridTemplateAreas: `
        "meta main"
        "calendar main"
      `,
        gridTemplateColumns: "280px 1fr",
      },
    },
  },
  large_timeslots: {
    variants: {
      default: {
        width: "100vw",
        gridTemplateAreas: `
          "meta main"
          "calendar main"
        `,
        gridTemplateColumns: "280px 1fr",
      },
    },
  },
};
