import { CONSOLE_URL, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";

// It ensures that redirection URL safe where it is accepted through a query params or other means where user can change it.
export const getSafeRedirectUrl = (url = "") => {
  if (!url) {
    return null;
  }
  if (url.search(/^https?:\/\//) === -1) {
    throw new Error("Pass an absolute URL");
  }

  // Avoid open redirection security vulnerability
  if (![CONSOLE_URL, WEBAPP_URL, WEBSITE_URL].some((u) => url.startsWith(u))) {
    url = `${WEBAPP_URL}/`;
  }

  return url;
};
