import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function useRouterQuery<T extends string>(name: T) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const existingQueryParams = pathname?.split("?")[1];

  const urlParams = new URLSearchParams(existingQueryParams);
  const query = Object.fromEntries(urlParams);

  const setQuery = (newValue: string | number | null | undefined) => {
    router.replace(
      { query: { ...Object.fromEntries(searchParams ?? new URLSearchParams()), [name]: newValue } },
      undefined,
      { shallow: true }
    );
    router.replace(
      { query: { ...Object.fromEntries(searchParams ?? new URLSearchParams()), ...query, [name]: newValue } },
      undefined,
      { shallow: true }
    );
  };

  return { [name]: query[name], setQuery } as {
    [K in T]: string | undefined;
  } & {
    setQuery: typeof setQuery;
  };
}
