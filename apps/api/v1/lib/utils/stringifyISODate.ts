export const stringifyISODate = (date: Date | undefined): string => {
  return `${date?.toISOString()}`;
};

// Recursively stringifies all Date objects in an object or array to ISO strings
export const stringifyDatesInObject = (obj: any): any => {
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(stringifyDatesInObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = stringifyDatesInObject(obj[key]);
      }
    }
    return result;
  }
  return obj;
};
