export const stringifyISODate = (date: Date | undefined): string => {
  return `${date?.toISOString()}`;
};
// TODO: create a function that takes an object and returns a stringified version of dates of it.
