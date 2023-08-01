import { usePathname, useSearchParams } from "next/navigation";

export const useUrlMatchesCurrentUrl = (url: string) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  let pathnameWithQuery;
  if (query) {
    pathnameWithQuery = `${pathname}?${query}`;
  } else {
    pathnameWithQuery = pathname;
  }
  // TODO: It should actually re-order the params before comparing ?a=1&b=2 should match with ?b=2&a=1
  return pathnameWithQuery.includes(url);
};
