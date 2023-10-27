import { usePathname, useSearchParams } from "next/navigation";

export default function useIsBookingPage(): boolean {
  const pathname = usePathname();
  const isBookingPage = ["/booking/", "/cancel", "/reschedule"].some((route) => pathname?.startsWith(route));

  const searchParams = useSearchParams();
  const userParam = Boolean(searchParams?.get("user"));
  const teamParam = Boolean(searchParams?.get("team"));

  return isBookingPage || userParam || teamParam;
}
