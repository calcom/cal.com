import { cubicBezier, useAnimate } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { useEffect } from "react";

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
    [key in BookerState | "default"]?: React.CSSProperties;
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
      minHeight: "0px",
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
      minHeight: "450px",
      height: "auto",
      gridTemplateAreas: `"meta main"`,
      gridTemplateColumns: "var(--booker-meta-width) var(--booker-main-width)",
    },
    selecting_time: {
      width: "calc(var(--booker-meta-width) + var(--booker-main-width) + var(--booker-timeslots-width))",
      minHeight: "450px",
      height: "auto",
      gridTemplateAreas: `"meta main timeslots"`,
      gridTemplateColumns: "var(--booker-meta-width) 1fr var(--booker-timeslots-width)",
    },
  },
  large_calendar: {
    default: {
      width: "100vw",
      height: "100vh",
      gridTemplateAreas: `"meta main"`,
      gridTemplateColumns: "var(--booker-meta-width) 1fr",
    },
  },
  large_timeslots: {
    default: {
      width: "100vw",
      height: "100vh",
      gridTemplateAreas: `"meta main"`,
      gridTemplateColumns: "var(--booker-meta-width) 1fr",
    },
  },
};

export const getBookerSizeClassNames = (layout: BookerLayout, bookerState: BookerState) => {
  return [
    // Size settings are abstracted on their own lines purely for readbility.
    // General sizes, used always
    "[--booker-timeslots-width:240px] lg:[--booker-timeslots-width:280px]",
    // Small calendar defaults
    layout === "small_calendar" && "[--booker-meta-width:240px]",
    // Meta column get's wider in booking view to fit the full date on a single row in case
    // of a multi occurance event. Also makes form less wide, which also looks better.
    layout === "small_calendar" &&
      bookerState === "booking" &&
      "[--booker-main-width:420px] lg:[--booker-meta-width:340px]",
    // Smaller meta when not in booking view.
    layout === "small_calendar" &&
      bookerState !== "booking" &&
      "[--booker-main-width:480px] lg:[--booker-meta-width:280px]",
    // Fullscreen view settings.
    layout !== "small_calendar" &&
      "[--booker-main-width:480px] [--booker-meta-width:340px] lg:[--booker-meta-width:424px]",
  ];
};

/**
 * This hook returns a ref that should be set on the booker element.
 * Based on that ref this hook animates the size of the booker element with framer motion.
 * It also takes into account the prefers-reduced-motion setting, to not animate when that's set.
 */
export const useBookerResizeAnimation = (layout: BookerLayout, state: BookerState) => {
  const prefersReducedMotion = useReducedMotion();
  const [animationScope, animate] = useAnimate();

  useEffect(() => {
    const animationConfig = resizeAnimationConfig[layout][state] || resizeAnimationConfig[layout].default;

    const animatedProperties = {
      height: animationConfig?.height || "auto",
    };

    const nonAnimatedProperties = {
      // Width is animated by the css class instead of via framer motion,
      // because css is better at animating the calcs, framer motion might
      // make some mistakes in that.
      width: animationConfig?.width || "auto",
      gridTemplateAreas: animationConfig?.gridTemplateAreas,
      gridTemplateColumns: animationConfig?.gridTemplateColumns,
      minHeight: animationConfig?.minHeight,
    };

    // We don't animate if users has set prefers-reduced-motion,
    // or when the layout is mobile.
    if (prefersReducedMotion || layout === "mobile") {
      animate(
        animationScope.current,
        {
          ...animatedProperties,
          ...nonAnimatedProperties,
        },
        {
          duration: 0,
        }
      );
    } else {
      animate(animationScope.current, nonAnimatedProperties, {
        duration: 0,
      });
      animate(animationScope.current, animatedProperties, {
        duration: 0.5,
        ease: cubicBezier(0.4, 0, 0.2, 1),
      });
    }
  }, [animate, animationScope, layout, prefersReducedMotion, state]);

  return animationScope;
};
