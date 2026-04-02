import type { ParsedUrlQuery } from "node:querystring";
import { stringify } from "node:querystring";
import { SINGLE_ORG_SLUG } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { RedirectType } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["lib", "handleOrgRedirect"] });
type NextJsRedirect = {
  redirect: {
    permanent: false;
    /**
     * It could be a full URL or a relative path
     */
    destination: string;
  };
};

function getSearchString(relativeOrAbsoluteUrl: string) {
  const url = new URL(relativeOrAbsoluteUrl, "http://localhost");
  return url.search;
}

const getTemporaryOrgRedirect = async ({
  slugs,
  redirectType,
  eventTypeSlug,
  currentQuery,
  useRelativePath = false,
}: {
  slugs: string[];
  redirectType: RedirectType;
  eventTypeSlug: string | null;
  currentQuery: ParsedUrlQuery;
  useRelativePath?: boolean;
}): Promise<NextJsRedirect | null> => {
  const prisma = (await import("@calcom/prisma")).default;
  log.debug(
    `Looking for redirect for`,
    safeStringify({
      slugs,
      redirectType,
      eventTypeSlug,
    })
  );

  const redirects = await prisma.tempOrgRedirect.findMany({
    where: {
      type: redirectType,
      from: {
        in: slugs,
      },
      fromOrgId: 0,
    },
  });

  if (!redirects.length) {
    return null;
  }

  // Use the first redirect origin as the new origin as we aren't supposed to handle different org usernames in a group
  const newOrigin = new URL(redirects[0].toUrl).origin;

  // Filter out any existing orgRedirection parameter to avoid duplicates
  // querystring.stringify transforms undefined values to empty strings, so we need to filter those out as well initially
  const filteredQuery = Object.entries(currentQuery).reduce((acc, [key, value]) => {
    if (key !== "orgRedirection" && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as ParsedUrlQuery);

  const currentQueryString = stringify(filteredQuery);
  const query = currentQueryString ? `?${currentQueryString}&orgRedirection=true` : "?orgRedirection=true";
  // Use the same order as in input slugs - It is important from Dynamic Group perspective as the first user's settings are used for various things
  const newSlugs = slugs.map((slug) => {
    const redirect = redirects.find((redirect) => redirect.from === slug);
    if (!redirect) {
      return slug;
    }
    const newSlug = new URL(redirect.toUrl).pathname.slice(1);
    return newSlug;
  });

  const newSlug = newSlugs.join("+");
  const newPath = newSlug ? `/${newSlug}` : "";

  // When in single org mode and not on actual org subdomain, use relative path to stay on same domain
  const newDestination = useRelativePath
    ? `${newPath}${eventTypeSlug ? `/${eventTypeSlug}` : ""}${query}`
    : `${newOrigin}${newPath}${eventTypeSlug ? `/${eventTypeSlug}` : ""}${query}`;
  log.debug(`Suggesting redirect from ${slugs} to ${newDestination}`);

  return {
    redirect: {
      permanent: false,
      destination: newDestination,
    },
  } as const;
};

interface HandleOrgRedirectParams {
  slugs: string[];
  redirectType: RedirectType;
  eventTypeSlug: string | null;
  context: {
    query: ParsedUrlQuery;
  };
  currentOrgDomain: string | null;
}

/**
 * Handles organization redirects for both regular org context and SINGLE_ORG_SLUG mode
 * The redirect is required for all existing user links and team links to keep working when a user/team is moved to an organization
 * Example:
 * - User "john87" is added to organization "acme" and his username in the organization is "john". So, cal.com/john87 is redirected to cal.com/john
 * - Team "acme-sales" is added to organization "acme" and its slug in the organization is "sales". So, cal.com/acme-sales is redirected to cal.com/sales
 *
 * Returns a redirect object if a redirect is needed, null otherwise
 */
export async function handleOrgRedirect({
  slugs,
  redirectType,
  eventTypeSlug,
  context,
  currentOrgDomain,
}: HandleOrgRedirectParams) {
  const isOrgContext = !!currentOrgDomain;
  const isARedirectFromNonOrgLink = context.query.orgRedirection === "true";

  // If we're not in an org context, the request could clearly be eligible for a redirect
  if (!isOrgContext) {
    const nextJsRedirect = await getTemporaryOrgRedirect({
      slugs,
      redirectType,
      eventTypeSlug,
      currentQuery: context.query,
    });

    if (nextJsRedirect) {
      return nextJsRedirect;
    }
  }

  const isSingleOrgMode = SINGLE_ORG_SLUG && isOrgContext;

  // When SINGLE_ORG_SLUG is set(which is possible in Self-Hosted instances), isOrgContext could be true even when the current domain is not an org subdomain
  // Example: my-instance.com could technically mean acme.my-instance.com where acme is the org slug
  // In such a case, the existing links which were on my-instance.com e.g. my-instance.com/john87 should be redirected to my-instance.com/john where john is the new username in Organization
  // This is why we need to follow redirect even when in Org Context
  if (!isSingleOrgMode) {
    return null;
  }

  // If already redirected from a non-org link, we shouldn't redirect again. Protects against infinite redirects
  if (isARedirectFromNonOrgLink) {
    return null;
  }

  // We're in single org mode but not on an actual org subdomain
  // Check if there's a redirect for this username
  // Use relative path since we want to stay on the same domain (my-instance.com)
  const nextJsRedirect = await getTemporaryOrgRedirect({
    slugs,
    redirectType,
    eventTypeSlug,
    currentQuery: context.query,
    useRelativePath: true,
  });

  return nextJsRedirect;
}

export async function getRedirectWithOriginAndSearchString({
  slugs,
  redirectType,
  context,
  currentOrgDomain,
}: Omit<HandleOrgRedirectParams, "eventTypeSlug">) {
  const nextJsRedirect = await handleOrgRedirect({
    slugs,
    redirectType,
    eventTypeSlug: null,
    context,
    currentOrgDomain,
  });
  if (!nextJsRedirect) {
    return null;
  }

  const newDestination = nextJsRedirect.redirect.destination;
  // If there is an origin use it, otherwise mark no new Origin and it remains the same domain
  const newOrigin =
    newDestination.startsWith("http://") || newDestination.startsWith("https://")
      ? new URL(newDestination).origin
      : null;

  return {
    origin: newOrigin,
    searchString: getSearchString(newDestination),
  };
}
