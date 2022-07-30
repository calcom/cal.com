/*
 * Detects navigator locale 24h time preference
 * It works by checking whether hour output contains AM ('1 AM' or '01 h')
 * based on the user's preferred language
 * defaults to 'en-US' (12h) if no navigator language is found
 */
import { localStorage } from "@calcom/lib/webstorage";

export const isBrowserLocale24h = () => {
  const localStorageTimeFormat = localStorage.getItem("timeOption.is24hClock");
  // If time format is already stored in the browser then retrieve and return early
  if (localStorageTimeFormat === "true") {
    return true;
  } else if (localStorageTimeFormat === "false") {
    return false;
  }

  let locale = "en-US";
  if (typeof window !== "undefined" && navigator) locale = window.navigator?.language;

  if (!new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(0).match(/M/)) {
    localStorage.setItem("timeOption.is24hClock", "false");
    return false;
  } else {
    localStorage.setItem("timeOption.is24hClock", "true");
    return true;
  }
};

export const detectBrowserTimeFormat = isBrowserLocale24h() ? "H:mm" : "h:mma";
