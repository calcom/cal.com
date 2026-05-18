// Using Intl directly instead of dayjs.tz.guess() so this module evaluates
// without requiring the timezone plugin to be extended first. When this file
// ends up in a vendor chunk that loads before `@calcom/dayjs/index.ts`
// (e.g. inside the bundled `@calcom/atoms` package), `dayjs.tz` is undefined
// and accessing `.guess()` crashes at module-eval time. `Intl.DateTimeFormat`
// is what `dayjs.tz.guess()` wraps internally and has no plugin dependency.
const guessedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const IS_EUROPE = guessedTimezone.indexOf("Europe") !== -1;
export const CURRENT_TIMEZONE = guessedTimezone !== "Etc/Unknown" ? guessedTimezone : "Europe/London";
