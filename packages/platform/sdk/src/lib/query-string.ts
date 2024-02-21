export const encodeArgsAsQueryString = (input: any, prefix?: string): string => {
  const pairs: string[] = [];
  for (const key in input) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];
      const encodedKey = prefix ? `${prefix}[${encodeURIComponent(key)}]` : encodeURIComponent(key);

      if (value !== null && typeof value === "object") {
        if (value instanceof Date) {
          pairs.push(`${encodedKey}=${encodeURIComponent(value.toISOString())}`);
        } else if (Array.isArray(value)) {
          value.forEach((v, i) => {
            if (typeof v === "object") {
              pairs.push(encodeArgsAsQueryString(v, `${encodedKey}[${i}]`));
            } else {
              pairs.push(`${encodedKey}[]=${encodeURIComponent(v)}`);
            }
          });
        } else {
          pairs.push(encodeArgsAsQueryString(value, encodedKey));
        }
      } else {
        pairs.push(`${encodedKey}=${encodeURIComponent(value)}`);
      }
    }
  }
  return pairs.join("&");
};
