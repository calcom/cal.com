import { usePathname, useSearchParams } from "next/navigation";

export default function usePublicPage() {
  const pathname = usePathname();
  const isPublicPage = ["/booking", "/cancel", "/reschedule"].some((route) => pathname?.startsWith(route));

  const searchParams = useSearchParams();
  const userParam = searchParams.get("user");
  const teamParam = searchParams.get("team");

  return isPublicPage || (userParam || teamParam);
}
