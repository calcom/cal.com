export const notUndefined = <T>(val: T | undefined): val is T => Boolean(val);
export const uniqueBy = <T extends { [key: string]: unknown }>(array: T[], key: keyof T) => {
  return array.filter((item, index, self) => index === self.findIndex((t) => t[key] === item[key]));
};
