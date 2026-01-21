import type { IncomingMessage } from "node:http";

import { IS_PRODUCTION, WEBSITE_URL, SINGLE_ORG_SLUG } from "@calcom/lib/constants";
import { ALLOWED_HOSTNAMES, RESERVED_SUBDOMAINS, WEBAPP_URL } from "@calcom/lib/constants";
import { getTldPlus1 } from "@calcom/lib/getTldPlus1";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";
import type { Prisma } from "@calcom/prisma/client";

const log = logger.getSubLogger({
  prefix: ["orgDomains.ts"],
});
/**
 * return the org slug
 * @param hostname
 */
export function getOrgSlug(hostname: string, forcedSlug?: string) {
  if (forcedSlug) {
    if (process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE) {
      log.debug("Using provided forcedSlug in E2E/Integration Test mode", {
        forcedSlug,
      });
      return forcedSlug;
    }
    log.debug("Ignoring forcedSlug in non-test mode", {
      forcedSlug,
    });
  }

  // If SINGLE_ORG_SLUG is set we know that the Cal.com instance is configured to run just one organization, so we can return the slug directly.
  if (SINGLE_ORG_SLUG) {
    log.debug("In Single Org Mode, using SINGLE_ORG_SLUG as the Org slug", { SINGLE_ORG_SLUG });
    return SINGLE_ORG_SLUG;
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
    log.warn("Match of WEBAPP_URL with ALLOWED_HOSTNAMES failed", { WEBAPP_URL, ALLOWED_HOSTNAMES });
    return null;
  }
  // Define which is the current domain/subdomain
  const slug = hostname.replace(currentHostname ? `.${currentHostname}` : "", "");
  const hasNoDotInSlug = slug.indexOf(".") === -1;
  if (hasNoDotInSlug) {
    return slug;
  }
  log.warn("Derived slug ended up having dots, so not considering it an org domain", { slug });
  return null;
}

export function getOrgDomainConfig({
  hostname,
  fallback,
  forcedSlug,
  isPlatform,
}: {
  hostname: string;
  fallback?: string | string[];
  forcedSlug?: string;
  isPlatform?: boolean;
}) {
  if (isPlatform && forcedSlug) {
    return {
      isValidOrgDomain: true,
      currentOrgDomain: forcedSlug,
    };
  }

  return getOrgDomainConfigFromHostname({
    hostname,
    fallback,
    forcedSlug,
  });
}

/**
 * @deprecated Use `getOrgDomainConfig` instead. To be removed in a future release. getOrgDomainConfig is more flexible and can be used without next request.
 */
export function orgDomainConfig(req: IncomingMessage | undefined, fallback?: string | string[]) {
  const forPlatform = isPlatformRequest(req);
  const forcedSlugHeader = req?.headers?.["x-cal-force-slug"];
  const forcedSlug = forcedSlugHeader instanceof Array ? forcedSlugHeader[0] : forcedSlugHeader;

  if (forPlatform && forcedSlug) {
    return {
      isValidOrgDomain: true,
      currentOrgDomain: forcedSlug,
    };
  }

  const hostname = req?.headers?.host || "";
  return getOrgDomainConfigFromHostname({
    hostname,
    fallback,
    forcedSlug,
  });
}

function isPlatformRequest(req: IncomingMessage | undefined) {
  return !!req?.headers?.["x-cal-client-id"];
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
  if (!IS_PRODUCTION && process.env.LOCAL_TESTING_DOMAIN_VERCEL) {
    // Allow testing with a valid domain so that we can test with deployment services like Vercel and Cloudflare locally.
    return process.env.LOCAL_TESTING_DOMAIN_VERCEL;
  }
  const urlSplit = WEBAPP_URL.replace("https://", "")?.replace("http://", "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
}

export function getOrgFullOrigin(slug: string | null, options: { protocol: boolean } = { protocol: true }) {
  if (!slug) {
    // Use WEBAPP_URL if domains differ (e.g., EU: app.cal.eu vs cal.com)
    const useWebappUrl =
      getTldPlus1(new URL(WEBSITE_URL).hostname) !== getTldPlus1(new URL(WEBAPP_URL).hostname);
    const baseUrl = useWebappUrl ? WEBAPP_URL : WEBSITE_URL;
    return options.protocol ? baseUrl : baseUrl.replace("https://", "").replace("http://", "");
  }

  const orgFullOrigin = `${
    options.protocol ? `${new URL(WEBSITE_URL).protocol}//` : ""
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
    isOrganization: true,
  } satisfies Prisma.TeamWhereInput;
}

export function userOrgQuery(req: IncomingMessage | undefined, fallback?: string | string[]) {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req, fallback);
  return isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null;
}
