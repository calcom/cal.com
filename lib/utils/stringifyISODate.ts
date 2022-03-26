export const stringifyISODate = (date: Date|undefined): string => {
  return `${date?.toISOString()}`
}
// FIXME: debug this, supposed to take an array/object and auto strinfy date-like values
export const autoStringifyDateValues = ([key, value]: [string, unknown]): [string, unknown] => { 
  return [key, typeof value === "object" && value instanceof Date ? stringifyISODate(value) : value]
}