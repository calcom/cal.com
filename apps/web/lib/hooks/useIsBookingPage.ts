import { usePathname } from "next/navigation";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

export default function useIsBookingPage(): boolean {
  const pathname = usePathname();
  const isBookingPage = [
    "/booking",
    "/cancel",
    "/reschedule",
    "/d", // Private Link of booking page
    "/apps/routing-forms/routing-link", // Routing Form page
    "/forms/", // Rewrites to /apps/routing-forms/routing-link
  ].some((route) => pathname?.startsWith(route));

  const searchParams = useCompatSearchParams();
  const userParam = Boolean(searchParams?.get("user"));
  const teamParam = Boolean(searchParams?.get("team"));

  return isBookingPage || userParam || teamParam;
}
