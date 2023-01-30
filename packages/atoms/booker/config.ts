import { BookerState } from "./types";

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
  transition: { ease: "easeInOut" },
};

export const cssVariableConfig = {
  // Since loading state probably isn't that heigh, we give it a initial height so the animation
  // so the animation won't looks smoother.
  "--booker-initial-height": "412px",
  // Width of the columns:
  "--booker-meta-width": "280px",
  "--booker-calendar-width": "425px",
  "--booker-form-width": "425px",
  "--booker-timeslots-width": "280px",
  // Animated variables by framer motion
  "--booker-max-width": "var(--booker-default-width)",
  "--booker-max-height": "var(--booker-initial-height)",
  // Infinite values are used to let the animation grow to the max size of the content.
  // This means that the value of these infinite vlaues should be a value that's never reached (on desktop).
  // Making it an unneccessary large value could cause a VERY fast animation though.
  "--booker-infinite-width": "2000px",
  "--booker-infinite-height": "2000px",
} as MotionStyleWithCssVar;

// Width without the timeslots being visible (taking up extra room);
cssVariableConfig["--booker-default-width"] =
  parseInt(cssVariableConfig["--booker-meta-width"]) +
  parseInt(cssVariableConfig["--booker-calendar-width"]) +
  "px";

export const resizeAnimationConfig = {
  [BookerState.LOADING]: {
    "--booker-max-width": "var(--booker-default-width)",
    "--booker-max-height": "var(--booker-initial-height)",
  } as MotionStyleWithCssVar,
  [BookerState.SELECTING_DATE]: {
    "--booker-max-width": "var(--booker-default-width)",
    "--booker-max-height": "var(--booker-infinite-height)",
  } as MotionStyleWithCssVar,
  [BookerState.SELECTING_TIME]: {
    "--booker-max-width": "var(--booker-infinite-width)",
    "--booker-max-height": "var(--booker-infinite-height)",
  } as MotionStyleWithCssVar,
  [BookerState.BOOKING]: {
    "--booker-max-width": "var(--booker-default-width)",
    "--booker-max-height": "var(--booker-infinite-height)",
  } as MotionStyleWithCssVar,
};
