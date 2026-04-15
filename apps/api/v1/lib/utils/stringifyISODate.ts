export const stringifyISODate = (date: Date | undefined): string => {
  return `${date?.toISOString()}`;
};

export const stringifyDatesDeep = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyDatesDeep(item));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        stringifyDatesDeep(val),
      ])
    );
  }

  return value;
};
