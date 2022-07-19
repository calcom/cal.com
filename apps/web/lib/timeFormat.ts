/*
 * Detects navigator locale 24h time preference
 * It works by checking whether hour output contains AM ('1 AM' or '01 h')
 * based on the user's preferred language
 * defaults to 'en-US' (12h) if no navigator language is found
 */
import { localStorage } from "@calcom/lib/webstorage";

export const isBrowserLocale24h = () => {
  let locale = "en-US";
  if (typeof window !== "undefined" && navigator) locale = window.navigator?.language;
  return !new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(0).match(/M/);
};

if (localStorage.getItem("timeOption.is24hClock") === null) {
  localStorage.setItem("timeOption.is24hClock", isBrowserLocale24h() ? "true" : "false");
}

export const detectBrowserTimeFormat = isBrowserLocale24h() ? "H:mm" : "h:mma";
