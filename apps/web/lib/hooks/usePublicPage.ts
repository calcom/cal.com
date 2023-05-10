export default function usePublicPage() {
  const isPublicPage = ["/[user]", "/booking", "/cancel", "/reschedule"].find((route) =>
    pathname?.startsWith(route)
  );
  return isPublicPage;
}
