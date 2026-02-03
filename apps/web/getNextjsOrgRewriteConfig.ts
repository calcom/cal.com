const isSingleOrgModeEnabled = !!process.env.NEXT_PUBLIC_SINGLE_ORG_SLUG;
const orgSlugCaptureGroupName = "orgSlug";

/**
 * Returns the leftmost subdomain from a given URL.
 * It needs the URL domain to have atleast two dots.
 * app.cal.com -> app
 * app.company.cal.com -> app
 * app.company.com -> app
 */
const getLeftMostSubdomain = (url: string): string | null => {
  let normalizedUrl = url;
  if (!normalizedUrl.startsWith("http:") && !normalizedUrl.startsWith("https:")) {
    // Make it a valid URL. Maybe we can simply return null and opt-out from orgs support till the use a URL scheme.
    normalizedUrl = `https://${normalizedUrl}`;
  }
  const _url = new URL(normalizedUrl);
  // Using positional capture instead of named capture group for ES2017 compatibility
  // Group 1: protocol (optional), Group 2: full domain, Group 3: subdomain
  const regex = /^([a-z]+:\/{2})?(([\w-.]+)\.[\w-]+\.\w+)$/;
  return _url.hostname.match(regex)?.[3] ?? null;
};

const getRegExpNotMatchingLeftMostSubdomain = (url: string): string => {
  const leftMostSubdomain = getLeftMostSubdomain(url);
  const subdomain = leftMostSubdomain ? `(?!${leftMostSubdomain})[^.]+` : "[^.]+";
  return subdomain;
};

export interface NextJsOrgRewriteConfig {
  orgSlug: string;
  orgHostPath: string;
  disableRootPathRewrite: boolean;
  disableRootEmbedPathRewrite: boolean;
}

// For app.cal.com, it will match all domains that are not starting with "app". Technically we would want to match domains like acme.cal.com, dunder.cal.com and not app.cal.com
export const getRegExpThatMatchesAllOrgDomains = ({ webAppUrl }: { webAppUrl: string }): string => {
  if (isSingleOrgModeEnabled) {
    console.log("Single-Org-Mode enabled - Consider all domains to be org domains");
    // It works in combination with next.config.js where in this case we use orgSlug=NEXT_PUBLIC_SINGLE_ORG_SLUG
    return `.*`;
  }
  const subdomainRegExp = getRegExpNotMatchingLeftMostSubdomain(webAppUrl);
  return `^(?<${orgSlugCaptureGroupName}>${subdomainRegExp})\\.(?!vercel\\.app).*`;
};

export const nextJsOrgRewriteConfig: NextJsOrgRewriteConfig = {
  // :orgSlug is special value which would get matching group from the regex in orgHostPath
  orgSlug: process.env.NEXT_PUBLIC_SINGLE_ORG_SLUG || `:${orgSlugCaptureGroupName}`,
  orgHostPath: getRegExpThatMatchesAllOrgDomains({
    webAppUrl: process.env.NEXT_PUBLIC_WEBAPP_URL || `https://${process.env.VERCEL_URL}`,
  }),
  // We disable root path rewrite because we want to serve dashboard on root path
  disableRootPathRewrite: isSingleOrgModeEnabled,
  // We disable root embed path rewrite in single org mode as well
  disableRootEmbedPathRewrite: isSingleOrgModeEnabled,
};
