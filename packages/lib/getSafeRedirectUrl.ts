import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";

// It ensures that redirection URL safe where it is accepted through a query params or other means where user can change it.
export const getSafeRedirectUrl = (url: string | undefined) => {
  url = url || "";
  if (url.search(/^https?:\/\//) === -1) {
    throw new Error("Pass an absolute URL");
  }

  // Avoid open redirection security vulnerability
  if (!url.startsWith(WEBAPP_URL) && !url.startsWith(WEBSITE_URL)) {
    url = `${WEBAPP_URL}/`;
  }

  return url;
};
