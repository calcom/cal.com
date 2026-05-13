import dayjs from "@calcom/dayjs";

// Defensively guard against dayjs.tz not being available yet.
// When @calcom/atoms bundles this file, it can be evaluated before
// @calcom/dayjs has extended dayjs with the timezone plugin.
// See: https://github.com/calcom/cal.com/issues/29341
function guessTimezone(): string {
  if (typeof dayjs.tz?.guess === "function") {
    return dayjs.tz.guess();
  }
  return "Etc/Unknown";
}

const guessedTz = guessTimezone();

export const IS_EUROPE = guessedTz.indexOf("Europe") !== -1;
export const CURRENT_TIMEZONE = guessedTz !== "Etc/Unknown" ? guessedTz : "Europe/London";
