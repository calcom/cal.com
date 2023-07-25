import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function useRouterQuery<T extends string>(name: T) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const setQuery = (newValue: string | number | null | undefined) => {
    const _searchParams = new URLSearchParams(searchParams);
    _searchParams.set(name, newValue as string);
    router.replace(`${pathname}?${_searchParams.toString()}`);
  };

  return { [name]: searchParams.get(name), setQuery } as {
    [K in T]: string | undefined;
  } & { setQuery: typeof setQuery };
}
