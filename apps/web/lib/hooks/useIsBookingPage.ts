import { usePathname } from "next/navigation";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

// Paths that are known non-booking root-level routes in the app.
// Any root-level path not in this list is treated as a potential username/booking page
// because catch-all Next.js routes make it impossible to distinguish statically.
const reservedRootPaths: string[] = [
  "/apps",
  "/auth",
  "/availability",
  "/bookings",
  "/enterprise",
  "/event-types",
  "/getting-started",
  "/insights",
  "/maintenance",
  "/members",
  "/more",
  "/onboarding",
  "/payment",
  "/profile",
  "/refer",
  "/settings",
  "/signup",
  "/teams",
  "/upgrade",
  "/video",
  "/workflows",
];

// Known booking-specific sub-paths that are definitively booking pages regardless of prefix.
const bookingSubPaths: string[] = [
  "/booking",
  "/cancel",
  "/reschedule",
  "/instant-meeting", // Instant booking page
  "/team", // Team booking pages
  "/d", // Private Link of booking page
  "/router", // Headless router page - Loads as a page when redirect type is customPageMessage
];

export default function useIsBookingPage(): boolean {
  const pathname = usePathname();

  const isBookingPage = bookingSubPaths.some((route) => pathname?.startsWith(route));

  // Treat root-level paths that aren't reserved app routes as username/booking pages.
  // e.g. /rick or /rick+partner resolve as booking pages via Next.js catch-all routes.
  const firstSegment = pathname ? `/${pathname.split("/")[1]}` : "";
  const isRootLevelBookingPage =
    firstSegment !== "" &&
    !reservedRootPaths.some((reserved) => firstSegment === reserved || pathname?.startsWith(`${reserved}/`));

  const isBookingsListPage = ["/upcoming", "/unconfirmed", "/recurring", "/cancelled", "/past"].some(
    (route) => pathname?.endsWith(route)
  );

  const searchParams = useCompatSearchParams();
  const isUserBookingPage = Boolean(searchParams?.get("user"));
  const isUserBookingTypePage = Boolean(searchParams?.get("user") && searchParams?.get("type"));

  return (isBookingPage && !isBookingsListPage) || isRootLevelBookingPage || isUserBookingPage || isUserBookingTypePage;
}
