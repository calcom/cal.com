export const notUndefined = <T>(val: T | undefined): val is T => Boolean(val);
export const uniqueBy = <T extends { [key: string]: unknown }>(array: T[], keys: (keyof T)[]) => {
  return array.filter(
    (item, index, self) => index === self.findIndex((t) => keys.every((key) => t[key] === item[key]))
  );
};
