import { usePathname } from "next/navigation";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

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
  ].some((route) => pathname?.startsWith(route));

  const searchParams = useCompatSearchParams();
  const isUserBookingPage = Boolean(searchParams?.get("user"));
  const isUserBookingTypePage = Boolean(searchParams?.get("user") && searchParams?.get("type"));

  return isBookingPage || isUserBookingPage || isUserBookingTypePage;
}
