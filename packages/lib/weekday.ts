// By default starts on Sunday (Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday)
export function weekdayNames(locale: string | string[], weekStart = 0, type: "short" | "long" = "long") {
  return Array.from(Array(7).keys()).map((d) => nameOfDay(locale, d + weekStart, type));
}

export function nameOfDay(locale: string | string[], day: number, type: "short" | "long" = "long") {
  return new Intl.DateTimeFormat(locale, { weekday: type }).format(new Date(1970, 0, day + 4));
}
