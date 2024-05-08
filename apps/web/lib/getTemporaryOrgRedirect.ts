import type { ParsedUrlQuery } from "querystring";
import { stringify } from "querystring";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { RedirectType } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["lib", "getTemporaryOrgRedirect"] });
export const getTemporaryOrgRedirect = async ({
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

  const currentQueryString = stringify(currentQuery);
  if (!redirects.length) {
    return null;
  }

  // Use the first redirect origin as the new origin as we aren't supposed to handle different org usernames in a group
  const newOrigin = new URL(redirects[0].toUrl).origin;
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

  const newDestination = `${newOrigin}${newPath}${eventTypeSlug ? `/${eventTypeSlug}` : ""}${query}`;
  log.debug(`Suggesting redirect from ${slugs} to ${newDestination}`);

  return {
    redirect: {
      permanent: false,
      destination: newDestination,
    },
  } as const;
};
