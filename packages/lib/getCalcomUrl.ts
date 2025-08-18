import { WEBAPP_URL, IS_CALCOM } from "./constants";

export const getCalcomUrl = () => {
  if (IS_CALCOM) {
    return new URL(WEBAPP_URL).hostname.endsWith("cal.eu") ? "https://cal.eu" : "https://cal.com";
  }
  return WEBAPP_URL;
};
