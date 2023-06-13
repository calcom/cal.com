import { useRouter } from "next/router";

export default function useRouterQuery<T extends string>(name: T) {
  const router = useRouter();
  const existingQueryParams = router.asPath.split("?")[1];

  const urlParams = new URLSearchParams(existingQueryParams);
  const query: Record<string, string | string[]> = {};
  // Following error is thrown by Typescript:
  // 'Type 'URLSearchParams' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher'
  // We should change the target to higher ES2019 atleast maybe
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  for (const [key, value] of urlParams) {
    if (!query[key]) {
      query[key] = value;
    } else {
      let queryValue = query[key];
      if (queryValue instanceof Array) {
        queryValue.push(value);
      } else {
        queryValue = query[key] = [queryValue];
        queryValue.push(value);
      }
    }
  }

  const setQuery = (newValue: string | number | null | undefined) => {
    router.replace({ query: { ...router.query, [name]: newValue } }, undefined, { shallow: true });
    router.replace({ query: { ...router.query, ...query, [name]: newValue } }, undefined, { shallow: true });
  };

  return { [name]: query[name], setQuery } as {
    [K in T]: string | undefined;
  } & { setQuery: typeof setQuery };
}
