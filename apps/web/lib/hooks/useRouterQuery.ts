import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

export default function useRouterQuery<T extends string>(name: T) {
  const searchParams = useCompatSearchParams();
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
