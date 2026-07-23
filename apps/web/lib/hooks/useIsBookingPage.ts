import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { usePathname } from "next/navigation";

const bookingRootPaths: string[] = [
  "/booking",
  "/cancel",
  "/reschedule",
  "/instant-meeting",
  "/team",
  "/d",
  "/router",
];

const bookingsListPaths: string[] = ["/upcoming", "/unconfirmed", "/recurring", "/cancelled", "/past"];

const reservedRootPaths: string[] = [
  "/_next",
  "/api",
  "/apps",
  "/auth",
  "/availability",
  "/bookings",
  "/cache",
  "/e2e",
  "/enterprise",
  "/event-types",
  "/getting-started",
  "/icons",
  "/maintenance",
  "/members",
  "/more",
  "/onboarding",
  "/payment",
  "/refer",
  "/settings",
  "/signup",
  "/upgrade",
  "/video",
];

function matchesPathSegment(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isBookingPath(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return false;

  const isKnownBookingPage = bookingRootPaths.some((route) => matchesPathSegment(pathname, route));
  const isBookingsListPage = bookingsListPaths.some((route) => pathname.endsWith(route));

  if (isKnownBookingPage) return !isBookingsListPage;

  return !reservedRootPaths.some((route) => matchesPathSegment(pathname, route));
}

export default function useIsBookingPage(): boolean {
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const isUserBookingPage = Boolean(searchParams?.get("user"));
  const isUserBookingTypePage = Boolean(searchParams?.get("user") && searchParams?.get("type"));

  return isBookingPath(pathname) || isUserBookingPage || isUserBookingTypePage;
}
