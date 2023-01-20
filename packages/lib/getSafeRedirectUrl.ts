import { CONSOLE_URL, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";

// It ensures that redirection URL safe where it is accepted through a query params or other means where user can change it.
export const getSafeRedirectUrl = (url = "") => {
  if (!url) {
    return null;
  }

  //It is important that this fn is given absolute URL because urls that don't start with HTTP can still deceive browser into redirecting to another domain
  if (url.search(/^https?:\/\//) === -1) {
    throw new Error("Pass an absolute URL");
  }

  const urlParsed = new URL(url);

  // Avoid open redirection security vulnerability
  if (![CONSOLE_URL, WEBAPP_URL, WEBSITE_URL].some((u) => new URL(u).origin === urlParsed.origin)) {
    url = `${WEBAPP_URL}/`;
  }

  return url;
};
