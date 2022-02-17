/*
 * Detects navigator locale 24h time preference
 * It works by checking whether hour output contains AM ('1 AM' or '01 h')
 * based on the user's preferred language
 * defaults to 'en-US' (12h) if no navigator language is found
 */
const locale = navigator ? navigator?.language : "en-US";
export const isBrowserLocale24h = () =>
  !new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(0).match(/AM/);
