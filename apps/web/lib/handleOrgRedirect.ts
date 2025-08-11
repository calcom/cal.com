import type { GetServerSidePropsContext } from "next";
import type { ParsedUrlQuery } from "querystring";
import { stringify } from "querystring";

import { SINGLE_ORG_SLUG } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { RedirectType } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["lib", "handleOrgRedirect"] });

/**
 * Internal function to get temporary org redirect from database
 * Only used by handleOrgRedirect
 */
const getTemporaryOrgRedirect = async ({
  slugs,
  redirectType,
  eventTypeSlug,
  currentQuery,
}: {
  slugs: string[] | string;
  redirectType: RedirectType;
  eventTypeSlug: string | null;
  currentQuery: ParsedUrlQuery;
}) => {
  const prisma = (await import("@calcom/prisma")).default;
  slugs = slugs instanceof Array ? slugs : [slugs];
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

  // Ensure we don't duplicate orgRedirection parameter
  const queryParams = { ...currentQuery };
  queryParams.orgRedirection = "true";
  const query = `?${stringify(queryParams)}`;
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

  const newDestination = `${newOrigin}${newPath}${eventTypeSlug ? `/${eventTypeSlug}` : ""}${query}`;
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
  context: GetServerSidePropsContext;
  currentOrgDomain: string | null;
}

/**
 * Handles organization redirects for both regular org context and SINGLE_ORG_SLUG mode
 * Returns a redirect object if a redirect is needed, null otherwise
 */
export async function handleOrgRedirect({
  slugs,
  redirectType,
  eventTypeSlug,
  context,
  currentOrgDomain,
}: HandleOrgRedirectParams) {
  // Derive these from the context/params
  const isOrgContext = !!currentOrgDomain;
  const isARedirectFromNonOrgLink = context.query.orgRedirection === "true";
  // Regular non-org context redirect check
  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs,
      redirectType,
      eventTypeSlug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  // SINGLE_ORG_SLUG mode redirect check
  // When SINGLE_ORG_SLUG is set, isOrgContext is true even without org subdomain
  // We need to check for redirects when users aren't found
  const isSingleOrgMode = SINGLE_ORG_SLUG && isOrgContext;
  const isActualOrgDomain = context.req.headers.host?.includes(currentOrgDomain || "");

  if (isSingleOrgMode && !isActualOrgDomain && !isARedirectFromNonOrgLink) {
    // We're in single org mode but not on an actual org subdomain
    // Check if there's a redirect for this username
    const redirect = await getTemporaryOrgRedirect({
      slugs,
      redirectType,
      eventTypeSlug,
      currentQuery: context.query,
    });

    if (redirect) {
      // Avoid infinite redirects by checking if we're already at the target
      const targetPath = new URL(redirect.redirect.destination).pathname;
      const currentPath = context.resolvedUrl?.split("?")[0];

      if (targetPath !== currentPath) {
        return redirect;
      }
    }
  }

  return null;
}
