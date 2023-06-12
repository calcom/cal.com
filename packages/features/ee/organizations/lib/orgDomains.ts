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

export function orgDomainConfig(hostname: string) {
  const currentOrgDomain = getOrgDomain(hostname);
  return {
    currentOrgDomain,
    isValidOrgDomain: currentOrgDomain !== "app" && !appHostnames.includes(currentOrgDomain),
  };
}

export function subdomainSuffix() {
  const urlSplit = WEBAPP_URL.replace("https://", "")?.replace("http://", "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
}
