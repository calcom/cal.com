import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function useRouterQuery<T extends string>(name: T) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const setQuery = useCallback(
    (newValue: string | number | null | undefined) => {
      const _searchParams = new URLSearchParams(searchParams ?? undefined);
      _searchParams.set(name, newValue as string);
      router.replace(`${pathname}?${_searchParams.toString()}`);
    },
    [name, pathname, router, searchParams]
  );

  return { [name]: searchParams?.get(name), setQuery } as {
    [K in T]: string | undefined;
  } & { setQuery: typeof setQuery };
}
