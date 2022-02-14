import { useRouter } from "next/router";

export default function usePublicPage() {
  const router = useRouter();
  const isPublicPage = ["/[user]"].find((route) => router.pathname.startsWith(route));
  return isPublicPage;
}
