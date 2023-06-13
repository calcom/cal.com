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
  const reg = new RegExp(`.(${appHostnames.join("|")})`);
  return hostname.match(reg) ? hostname.replace(reg, "") : null;
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
