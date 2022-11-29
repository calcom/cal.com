import { useRouter } from "next/router";

export default function useRouterQuery<T extends string>(name: T) {
  const router = useRouter();
  const existingQueryParams = router.asPath.split("?")[1];

  const urlParams = new URLSearchParams(existingQueryParams);
  const query = Object.fromEntries(urlParams);

  const setQuery = (newValue: string | number | null | undefined) => {
    router.replace({ query: { ...router.query, [name]: newValue } }, undefined, { shallow: true });
    router.replace({ query: { ...router.query, ...query, [name]: newValue } }, undefined, { shallow: true });
  };

  return { [name]: query[name], setQuery } as {
    [K in T]: string | undefined;
  } & { setQuery: typeof setQuery };
}
