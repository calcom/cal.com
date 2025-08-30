const isSingleOrgModeEnabled = !!process.env.NEXT_PUBLIC_SINGLE_ORG_SLUG;
const orgSlugCaptureGroupName = "orgSlug";
/**
 * Returns the leftmost subdomain from a given URL.
 * It needs the URL domain to have atleast two dots.
 * app.cal.com -> app
 * app.company.cal.com -> app
 * app.company.com -> app
 */
const getLeftMostSubdomain = (url) => {
  if (!url.startsWith("http:") && !url.startsWith("https:")) {
    // Make it a valid URL. Maybe we can simply return null and opt-out from orgs support till the use a URL scheme.
    url = `https://${url}`;
  }
  const _url = new URL(url);
  const regex = new RegExp(/^([a-z]+\:\/{2})?((?<subdomain>[\w-.]+)\.[\w-]+\.\w+)$/);
  //console.log(_url.hostname, _url.hostname.match(regex));
  return _url.hostname.match(regex)?.groups?.subdomain || null;
};

const getRegExpNotMatchingLeftMostSubdomain = (url) => {
  const leftMostSubdomain = getLeftMostSubdomain(url);
  const subdomain = leftMostSubdomain ? `(?!${leftMostSubdomain})[^.]+` : "[^.]+";
  return subdomain;
};

// For app.cal.com, it will match all domains that are not starting with "app". Technically we would want to match domains like acme.cal.com, dunder.cal.com and not app.cal.com
const getRegExpThatMatchesAllOrgDomains = (exports.getRegExpThatMatchesAllOrgDomains = ({ webAppUrl }) => {
  if (isSingleOrgModeEnabled) {
    console.log("Single-Org-Mode enabled - Consider all domains to be org domains");
    // It works in combination with next.config.js where in this case we use orgSlug=NEXT_PUBLIC_SINGLE_ORG_SLUG
    return `.*`;
  }
  const subdomainRegExp = getRegExpNotMatchingLeftMostSubdomain(webAppUrl);
  return `^(?<${orgSlugCaptureGroupName}>${subdomainRegExp})\\.(?!vercel\.app).*`;
});

const nextJsOrgRewriteConfig = {
  // :orgSlug is special value which would get matching group from the regex in orgHostPath
  orgSlug: process.env.NEXT_PUBLIC_SINGLE_ORG_SLUG || `:${orgSlugCaptureGroupName}`,
  orgHostPath: getRegExpThatMatchesAllOrgDomains({
    webAppUrl: process.env.NEXT_PUBLIC_WEBAPP_URL || `https://${process.env.VERCEL_URL}`,
  }),
  // We disable root path rewrite because we want to serve dashboard on root path
  disableRootPathRewrite: isSingleOrgModeEnabled,
};

exports.nextJsOrgRewriteConfig = nextJsOrgRewriteConfig;
