import type { Prisma } from "@prisma/client";

import { ALLOWED_HOSTNAMES, RESERVED_SUBDOMAINS, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";

/**
 * return the org slug
 * @param hostname
 */
export function getOrgSlug(hostname: string) {
  if (!hostname.includes(".")) {
    // A no-dot domain can never be org domain. It automatically handles localhost
    return null;
  }
  // Find which hostname is being currently used
  const currentHostname = ALLOWED_HOSTNAMES.find((ahn) => {
    const url = new URL(WEBAPP_URL);
    const testHostname = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
    return testHostname.endsWith(`.${ahn}`);
  });
  logger.debug(`getOrgSlug: ${hostname} ${currentHostname}`, {
    ALLOWED_HOSTNAMES,
    WEBAPP_URL,
    currentHostname,
    hostname,
  });
  if (currentHostname) {
    // Define which is the current domain/subdomain
    const slug = hostname.replace(`.${currentHostname}` ?? "", "");
    return slug.indexOf(".") === -1 ? slug : null;
  }
  return null;
}

export function orgDomainConfig(hostname: string, fallback?: string | string[]) {
  const currentOrgDomain = getOrgSlug(hostname);
  const isValidOrgDomain = currentOrgDomain !== null && !RESERVED_SUBDOMAINS.includes(currentOrgDomain);
  logger.debug(`orgDomainConfig: ${hostname} ${currentOrgDomain} ${isValidOrgDomain}`);
  if (isValidOrgDomain || !fallback) {
    return {
      currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
      isValidOrgDomain,
    };
  }
  const fallbackOrgSlug = fallback as string;
  const isValidFallbackDomain = !RESERVED_SUBDOMAINS.includes(fallbackOrgSlug);
  return {
    currentOrgDomain: isValidFallbackDomain ? fallbackOrgSlug : null,
    isValidOrgDomain: isValidFallbackDomain,
  };
}

export function subdomainSuffix() {
  const urlSplit = WEBAPP_URL.replace("https://", "")?.replace("http://", "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
}

export function getOrgFullOrigin(slug: string, options: { protocol: boolean } = { protocol: true }) {
  if (!slug) return WEBAPP_URL;
  return `${options.protocol ? `${new URL(WEBAPP_URL).protocol}//` : ""}${slug}.${subdomainSuffix()}`;
}

/**
 * @deprecated You most probably intend to query for an organization only, use `whereClauseForOrgWithSlugOrRequestedSlug` instead which will only return the organization and not a team accidentally.
 */
export function getSlugOrRequestedSlug(slug: string) {
  const slugifiedValue = slugify(slug);
  return {
    OR: [
      { slug: slugifiedValue },
      {
        metadata: {
          path: ["requestedSlug"],
          equals: slugifiedValue,
        },
      },
    ],
  } satisfies Prisma.TeamWhereInput;
}

export function whereClauseForOrgWithSlugOrRequestedSlug(slug: string) {
  const slugifiedValue = slugify(slug);

  return {
    OR: [
      { slug: slugifiedValue },
      {
        metadata: {
          path: ["requestedSlug"],
          equals: slug,
        },
      },
    ],
    metadata: {
      path: ["isOrganization"],
      equals: true,
    },
  } satisfies Prisma.TeamWhereInput;
}

export function userOrgQuery(hostname: string, fallback?: string | string[]) {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(hostname, fallback);
  return isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null;
}
