import { usePathname, useSearchParams } from "next/navigation";

export default function useIsBookingPage() {
  const pathname = usePathname();
  const isBookingPage = ["/booking/", "/cancel", "/reschedule"].some((route) => pathname?.startsWith(route));

  const searchParams = useSearchParams();
  const userParam = searchParams.get("user");
  const teamParam = searchParams.get("team");

  return !!(isBookingPage || userParam || teamParam);
}
