import { getEnv } from "@/env";

/**
 * Get the subdomain suffix for organization URLs
 * Adapted from @calcom/features/ee/organizations/lib/orgDomains
 */
function subdomainSuffix(): string {
  const webAppUrl = getEnv("WEB_APP_URL", "https://app.cal.com");
  const urlSplit = webAppUrl.replace("https://", "").replace("http://", "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
}

/**
 * Get the full origin URL for an organization
 * Adapted from @calcom/features/ee/organizations/lib/orgDomains
 *
 * @param slug - Organization slug, or null for non-org URLs
 * @param options - Configuration options
 * @returns Full origin URL (e.g., "https://org.cal.com" or "https://cal.com")
 */
export function getOrgFullOrigin(
  slug: string | null,
  options: { protocol: boolean } = { protocol: true }
): string {
  // Use NEXT_PUBLIC_WEBSITE_URL if available (for booking URLs), fallback to WEB_APP_URL
  // This matches the behavior in @calcom/features/ee/organizations/lib/orgDomains
  const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || getEnv("WEB_APP_URL", "https://app.cal.com");

  if (!slug) {
    return options.protocol ? websiteUrl : websiteUrl.replace("https://", "").replace("http://", "");
  }

  const protocol = options.protocol ? `${new URL(websiteUrl).protocol}//` : "";
  const orgFullOrigin = `${protocol}${slug}.${subdomainSuffix()}`;

  return orgFullOrigin;
}

