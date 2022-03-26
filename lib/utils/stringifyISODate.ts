export const stringifyISODate = (date: Date|undefined): string => {
  return `${date?.toISOString()}`
}

export const autoStringifyDateValues = ([key, value]: [string, unknown]): [string, unknown] => { 
  console.log(key,value)
  return [key, typeof value === "object" && value instanceof Date ? stringifyISODate(value) : value]
}