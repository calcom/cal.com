import { isReservedRoute } from "@lib/reservedRoutes";

/**
 * Extracts the username from a pathname for booking page locale detection.
 * Handles various URL patterns including org-based and team-based routes.
 */
export function extractUsernameFromPathname(pathname: string): string | undefined {
  if (!pathname) return undefined;

  const pathSegments = pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) return undefined;

  const firstSegment = pathSegments[0];

  // For /[username] and /[username]/[type]
  // Don't treat reserved routes as usernames
  if (!isReservedRoute(firstSegment)) {
    return firstSegment;
  }

  // For /org/[orgSlug]/[username] - org is reserved, so we need special handling
  // to extract the username at position [2]
  if (firstSegment === "org" && pathSegments.length > 2) {
    const potentialUsername = pathSegments[2];
    if (!isReservedRoute(potentialUsername)) {
      return potentialUsername;
    }
  }

  // For /team/[teamSlug]/[username] - team is reserved, so we need special handling
  // to extract the username at position [2]
  if (firstSegment === "team" && pathSegments.length > 2) {
    const potentialUsername = pathSegments[2];
    if (!isReservedRoute(potentialUsername)) {
      return potentialUsername;
    }
  }

  return undefined;
}
