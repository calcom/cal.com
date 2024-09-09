/// <reference types="node" />
import type { IncomingMessage } from "http";
/**
 * return the org slug
 * @param hostname
 */
export declare function getOrgSlug(hostname: string, forcedSlug?: string): string | null;
export declare function orgDomainConfig(req: IncomingMessage | undefined, fallback?: string | string[]): {
    currentOrgDomain: string | null;
    isValidOrgDomain: boolean;
};
export declare function getOrgDomainConfigFromHostname({ hostname, fallback, forcedSlug, }: {
    hostname: string;
    fallback?: string | string[];
    forcedSlug?: string;
}): {
    currentOrgDomain: string | null;
    isValidOrgDomain: boolean;
};
export declare function subdomainSuffix(): string;
export declare function getOrgFullOrigin(slug: string | null, options?: {
    protocol: boolean;
}): string;
/**
 * @deprecated You most probably intend to query for an organization only, use `whereClauseForOrgWithSlugOrRequestedSlug` instead which will only return the organization and not a team accidentally.
 */
export declare function getSlugOrRequestedSlug(slug: string): {
    OR: ({
        slug: string;
        metadata?: undefined;
    } | {
        metadata: {
            path: string[];
            equals: string;
        };
        slug?: undefined;
    })[];
};
export declare function whereClauseForOrgWithSlugOrRequestedSlug(slug: string): {
    OR: ({
        slug: string;
        metadata?: undefined;
    } | {
        metadata: {
            path: string[];
            equals: string;
        };
        slug?: undefined;
    })[];
    isOrganization: true;
};
export declare function userOrgQuery(req: IncomingMessage | undefined, fallback?: string | string[]): {
    OR: ({
        slug: string;
        metadata?: undefined;
    } | {
        metadata: {
            path: string[];
            equals: string;
        };
        slug?: undefined;
    })[];
} | null;
//# sourceMappingURL=orgDomains.d.ts.map