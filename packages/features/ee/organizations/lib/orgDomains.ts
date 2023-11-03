import type { Prisma } from "@prisma/client";
import type { IncomingMessage } from "http";

import { ALLOWED_HOSTNAMES, RESERVED_SUBDOMAINS, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";

const log = logger.getSubLogger({
  prefix: ["orgDomains.ts"],
});
/**
 * return the org slug
 * @param hostname
 */
export function getOrgSlug(hostname: string, forcedSlug?: string) {
  if (forcedSlug) {
    if (process.env.NEXT_PUBLIC_IS_E2E) {
      log.debug("Using provided forcedSlug in E2E", {
        forcedSlug,
      });
      return forcedSlug;
    }
    log.debug("Ignoring forcedSlug in non-test mode", {
      forcedSlug,
    });
  }

  if (!hostname.includes(".")) {
    log.warn('Org support not enabled for hostname without "."', { hostname });
    // A no-dot domain can never be org domain. It automatically considers localhost to be non-org domain
    return null;
  }
  // Find which hostname is being currently used
  const currentHostname = ALLOWED_HOSTNAMES.find((ahn) => {
    const url = new URL(WEBAPP_URL);
    const testHostname = `${url.hostname}${url.port ? `:${url.port}` : ""}`;
    return testHostname.endsWith(`.${ahn}`);
  });

  if (!currentHostname) {
    log.warn("Match of WEBAPP_URL with ALLOWED_HOSTNAME failed", { WEBAPP_URL, ALLOWED_HOSTNAMES });
    return null;
  }
  // Define which is the current domain/subdomain
  const slug = hostname.replace(`.${currentHostname}` ?? "", "");
  const hasNoDotInSlug = slug.indexOf(".") === -1;
  if (hasNoDotInSlug) {
    return slug;
  }
  log.warn("Derived slug ended up having dots, so not considering it an org domain", { slug });
  return null;
}

export function orgDomainConfig(req: IncomingMessage | undefined, fallback?: string | string[]) {
  const forcedSlugHeader = req?.headers?.["x-cal-force-slug"];

  const forcedSlug = forcedSlugHeader instanceof Array ? forcedSlugHeader[0] : forcedSlugHeader;

  const hostname = req?.headers?.host || "";
  return getOrgDomainConfigFromHostname({
    hostname,
    fallback,
    forcedSlug,
  });
}

export function getOrgDomainConfigFromHostname({
  hostname,
  fallback,
  forcedSlug,
}: {
  hostname: string;
  fallback?: string | string[];
  forcedSlug?: string;
}) {
  const currentOrgDomain = getOrgSlug(hostname, forcedSlug);
  const isValidOrgDomain = currentOrgDomain !== null && !RESERVED_SUBDOMAINS.includes(currentOrgDomain);
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
  const orgFullOrigin = `${
    options.protocol ? `${new URL(WEBAPP_URL).protocol}//` : ""
  }${slug}.${subdomainSuffix()}`;
  return orgFullOrigin;
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
  const { currentOrgDomain, isValidOrgDomain } = getOrgDomainConfigFromHostname({ hostname, fallback });
  return isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null;
}
