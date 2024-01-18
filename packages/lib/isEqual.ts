const isEqual = <T extends Record<string, unknown>>(x: T, y: T): boolean => {
  if (typeof x !== "object" || typeof y !== "object" || x === null || y === null) {
    return x === y;
  }
  const xKeys = Object.keys(x);
  const yKeys = Object.keys(y);

  if (xKeys.length !== yKeys.length) {
    return false;
  }

  for (const key of xKeys) {
    if (!y.hasOwnProperty(key)) {
      return false;
    }

    const xValue = x[key];
    const yValue = y[key];

    // Check if values are objects, if so, recursively call isEqual
    if (typeof xValue === "object" && typeof yValue === "object" && xValue !== null && yValue !== null) {
      if (!isEqual(xValue as Record<string, unknown>, yValue as Record<string, unknown>)) {
        return false;
      }
    } else if (xValue !== yValue) {
      // If not objects, check for equality directly
      return false;
    }
  }

  return true;
};

export default isEqual;
