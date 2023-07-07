import { CAL_URL, WEBAPP_URL } from "./constants";

/**
 * It is a simpler(no HTTP request) alternative to get full URL of a path
 * Should be used on app.cal.com Pages and not Booking Pages(which can be accessed through website URL also)
 */
export function getOrgAwareUrlOnClient(path: string) {
  if (!path.startsWith("/")) {
    throw new Error("path must start with /");
  }
  const documentURLObj = new URL(document.URL);
  const webAppUrlObj = new URL(WEBAPP_URL);
  const isNonOrgDomain = documentURLObj.host === webAppUrlObj.host;
  if (isNonOrgDomain) {
    return `${CAL_URL}${path}`;
  }
  return `${documentURLObj.href.replace(/\/$/, "")}${path}`;
}

export default getOrgAwareUrlOnClient;
