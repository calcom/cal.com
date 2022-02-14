import { useRouter } from "next/router";

export default function usePublicPage() {
  const router = useRouter();
  const isPublicPage = ["/[user]", "/success", "/cancel"].find((route) => router.pathname.startsWith(route));
  return isPublicPage;
}
