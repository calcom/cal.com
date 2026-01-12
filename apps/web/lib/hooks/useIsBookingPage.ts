import { usePathname } from "next/navigation";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
// TODO: This approach of checking booking page isn't correct.
// app.cal.com/rick is a booking page but useIsBookingPage won't return true. This is because all unregistered router in Next.js could technically be a booking page throw catch all routes.
// The only way to confirm it is by actually checking if we actually rendered a booking route.
export default function useIsBookingPage(): boolean {
  const pathname = usePathname();
  const isBookingPage = [
    "/booking",
    "/cancel",
    "/reschedule",
    "/instant-meeting", // Instant booking page
    "/team", // Team booking pages
    "/d", // Private Link of booking page
    "/apps/routing-forms/routing-link", // Routing Form page
    "/forms/", // Rewrites to /apps/routing-forms/routing-link
    "/router", // Headless router page - Loads as a page when redirect type is customPageMessage
  ].some((route) => pathname?.startsWith(route));
  const isBookingsListPage = ["/upcoming", "/unconfirmed", "/recurring", "/cancelled", "/past"].some(
    (route) => pathname?.endsWith(route)
  );

  const searchParams = useCompatSearchParams();
  const isUserBookingPage = Boolean(searchParams?.get("user"));
  const isUserBookingTypePage = Boolean(searchParams?.get("user") && searchParams?.get("type"));

  return (isBookingPage && !isBookingsListPage) || isUserBookingPage || isUserBookingTypePage;
}
