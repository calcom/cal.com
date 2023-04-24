import type { TargetAndTransition } from "framer-motion";

import type { BookerLayout, BookerState } from "./types";

// Framer motion fade in animation configs.
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
    [key in BookerState | "default"]?: TargetAndTransition;
  };
};

/**
 * This configuration is used to animate the grid container for the booker.
 * The object is structured as following:
 *
 * The root property of the object: is the name of the layout
 * (mobile, small_calendar, large_calendar, large_timeslots)
 *
 * The values of these properties are objects that define the animation for each state of the booker.
 * The animation have the same properties as you could pass to the animate prop of framer-motion:
 * @see: https://www.framer.com/motion/animation/
 */
export const resizeAnimationConfig: ResizeAnimationConfig = {
  mobile: {
    default: {
      width: "100%",
      gridTemplateAreas: `
          "meta"
          "main"
          "timeslots"
        `,
      gridTemplateColumns: "100%",
    },
  },
  small_calendar: {
    default: {
      width: "calc(var(--booker-meta-width) + var(--booker-main-width))",
      gridTemplateAreas: `"meta main"`,
      gridTemplateColumns: "var(--booker-meta-width) var(--booker-main-width)",
    },
    selecting_time: {
      width: "calc(var(--booker-meta-width) + var(--booker-main-width) + var(--booker-timeslots-width))",
      gridTemplateAreas: `"meta main timeslots"`,
      gridTemplateColumns: "var(--booker-meta-width) var(--booker-main-width) var(--booker-timeslots-width)",
    },
  },
  large_calendar: {
    default: {
      width: "100%",
      gridTemplateAreas: `"meta main"`,
      gridTemplateColumns: "var(--booker-meta-width) 1fr",
    },
  },
  large_timeslots: {
    default: {
      width: "100%",
      gridTemplateAreas: `"meta main"`,
      gridTemplateColumns: "var(--booker-meta-width) 1fr",
    },
  },
};
