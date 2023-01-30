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
