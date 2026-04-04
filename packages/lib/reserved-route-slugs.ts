import { APP_RESERVED_ROUTE_SLUGS } from "./generated/app-reserved-route-slugs.generated";

// Website routes served by Framer (cal.com marketing site).
// Populated manually for now — can be automated via Framer API later.
const WEBSITE_RESERVED_ROUTE_SLUGS: string[] = [];

export const RESERVED_ROUTE_SLUGS: string[] = [
  ...APP_RESERVED_ROUTE_SLUGS,
  ...WEBSITE_RESERVED_ROUTE_SLUGS,
];

const reservedSet = new Set(RESERVED_ROUTE_SLUGS.map((s) => s.toLowerCase()));

export function isReservedRouteSlug(slug: string): boolean {
  return reservedSet.has(slug.toLowerCase());
}
