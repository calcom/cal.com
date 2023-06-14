import { WEBAPP_URL } from "@calcom/lib/constants";

// Define which hostnames are expected for the app
export const appHostnames = [
  "cal.com",
  "cal.dev",
  "cal-staging.com",
  "cal.community",
  "cal.local:3000",
  // ⬇️ Prevents 404 error for normal localhost development, makes it backwards compatible
  "localhost:3000",
];

/**
 * return the org slug
 * @param hostname
 */
export function getOrgDomain(hostname: string) {
  // Find which hostname is being currently used
  const currentHostname = appHostnames.find((ahn) => {
    const url = new URL(WEBAPP_URL);
    const testHostname = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
    return testHostname.endsWith(`.${ahn}`);
  });
  if (currentHostname) {
    // Define which is the current domain/subdomain
    const slug = hostname.replace(`.${currentHostname}` ?? "", "");
    return slug.indexOf(".") === -1 ? slug : null;
  }
  return null;
}

export function orgDomainConfig(hostname: string) {
  const currentOrgDomain = getOrgDomain(hostname);
  return {
    currentOrgDomain,
    isValidOrgDomain:
      currentOrgDomain !== null && currentOrgDomain !== "app" && !appHostnames.includes(currentOrgDomain),
  };
}

export function subdomainSuffix() {
  const urlSplit = WEBAPP_URL.replace("https://", "")?.replace("http://", "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
}
