import { usePathname } from "next/navigation";

export default function usePublicPage() {
  const pathname = usePathname();
  const isPublicPage = ["/[user]", "/booking", "/cancel", "/reschedule"].find((route) =>
    pathname?.startsWith(route)
  );
  return isPublicPage;
}
