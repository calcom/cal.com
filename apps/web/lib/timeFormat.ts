/*
 * Detects navigator locale 24h time preference
 * It works by checking whether hour output contains AM ('1 AM' or '01 h')
 * based on the user's preferred language
 * defaults to 'en-US' (12h) if no navigator language is found
 */
import { localStorage } from "@calcom/lib/webstorage";

export const isBrowserLocale24h = () => {
  let locale = "en-US";
  if (typeof window !== "undefined" && navigator) locale = navigator?.language;
  return !new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(0).match(/AM/);
};

console.log(
  `🚀 ~ file: timeFormat.ts ~ line 17 ~ localStorage.getItem("timeOption.is24hClock")`,
  localStorage.getItem("timeOption.is24hClock")
);

if (localStorage.getItem("timeOption.is24hClock") === null) {
  console.log("true");
}

export const detectBrowserTimeFormat = isBrowserLocale24h() ? "h:mma" : "H:mm";
