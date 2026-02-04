export const stringifyISODate = (date: Date | undefined): string => {
  return `${date?.toISOString()}`;
};

export const stringifyDatesDeep = <T>(value: T): T => {
  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyDatesDeep(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        stringifyDatesDeep(val),
      ])
    ) as T;
  }

  return value;
};
