export const stringifyISODate = (date: Date|undefined): string => {
  return `${date?.toISOString()}`
}