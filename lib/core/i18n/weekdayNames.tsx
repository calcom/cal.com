export default function weekdayNames(
  locales: string | string[],
  options: {
    style?: "short" | "long" | "narrow";
    weekStart?: number;
  }
) {
  const { weekStart = 0, style = "long" } = options;
  return [...Array(7).keys()].map((key) => {
    // in 1970, January 4 is Sunday, so if weekStart = 1, it is Monday.
    const day = key + 4 + weekStart;
    const weekday = Intl.DateTimeFormat(locales, { weekday: style }).format(new Date(1970, 0, day));
    // Removes the trailing dot (if present) e.g. in PT locale
    if (style === "short" && weekday.endsWith(".")) {
      return weekday.substr(0, weekday.length - 1);
    }

    return weekday;
  });
}
