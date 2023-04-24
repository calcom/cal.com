export const notUndefined = <T>(val: T | undefined): val is T => Boolean(val);
