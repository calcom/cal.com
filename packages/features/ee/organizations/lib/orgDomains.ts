import { WEBAPP_URL } from "@calcom/lib/constants";

// Define which hostnames are expected for the app
export const appHostnames = ["cal.com", "cal.dev", "cal.community", "cal.local:3000"];

export function getOrgDomain(hostname: string) {
  // Find which hostname is being currently used
  const currentHostname = appHostnames.find((ahn) => {
    const url = new URL(WEBAPP_URL);
    const hostname = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
    return hostname.endsWith(`.${ahn}`);
  });
  // Define which is the current domain/subdomain
  return hostname.replace(`.${currentHostname}` ?? "", "");
}

export function isValidOrgDomain(hostname: string) {
  return !appHostnames.includes(getOrgDomain(hostname));
}
