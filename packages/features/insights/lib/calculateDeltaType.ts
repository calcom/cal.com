export const calculateDeltaType = (delta: number) => {
  if (delta > 0) {
    return delta > 10 ? "increase" : "moderateIncrease";
  } else if (delta < 0) {
    return delta < -10 ? "decrease" : "moderateDecrease";
  } else {
    return "unchanged";
  }
};
