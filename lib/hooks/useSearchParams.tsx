import { useRouter } from "next/router";
import { useMemo } from "react";

/**
 * Ugly hack for using search params as `useRouter()` won't return it on first render
 */
export function useSearchParams() {
  const router = useRouter();

  const { asPath, query, pathname } = router;
  const value = useMemo(() => {
    // if we have query params from the router, let's return that
    if (Object.keys(query).length > 0) {
      return query;
    }
    // split path by `/` or `?`
    const pathnameParts = pathname.split(/\/|\?/);
    const asPathParts = asPath.split(/\/|\?/);

    // actual query object that we wanna use
    const actualQuery: typeof query = {};
    for (let index = 0; index < pathnameParts.length; index++) {
      const part = pathnameParts[index];
      if (!part.startsWith("[") || !part.endsWith("]")) {
        continue;
      }
      // extract real query param from `post/[id]` style routes

      // removes first and last character
      const key = part.slice(1, -1);

      // append to "actual query"
      actualQuery[key] = asPathParts[index];
    }

    // get search params that are in the url
    const searchParams = new URLSearchParams(asPath.split("?").pop() || "");
    const searchParamsAsObject = Object.fromEntries(searchParams);

    for (const key in searchParamsAsObject) {
      actualQuery[key] = searchParamsAsObject[key];
    }
    return actualQuery;
  }, [asPath, query, pathname]);

  return value;
}
