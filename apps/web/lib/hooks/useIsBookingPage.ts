import { usePathname } from "next/navigation";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

export default function useIsBookingPage(): boolean {
  const pathname = usePathname();
  const isBookingPage = ["/booking/", "/cancel", "/reschedule"].some((route) => pathname?.startsWith(route));

  const searchParams = useCompatSearchParams();
  const userParam = Boolean(searchParams?.get("user"));
  const teamParam = Boolean(searchParams?.get("team"));

  return isBookingPage || userParam || teamParam;
}
