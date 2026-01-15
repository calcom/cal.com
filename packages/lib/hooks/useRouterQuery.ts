import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

/**
 * An alternative to Object.fromEntries that allows duplicate keys.
 * There is a duplicate of the function in @calcom/embeds/embed-core/src/utils.ts. Keep them in sync.
 */
function fromEntriesWithDuplicateKeys(entries: IterableIterator<[string, string]> | null) {
  const result: Record<string, string | string[]> = {};

  if (entries === null) {
    return result;
  }

  // Consider setting atleast ES2015 as target
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  for (const [key, value] of entries) {
    if (result.hasOwnProperty(key)) {
      let currentValue = result[key];
      if (!Array.isArray(currentValue)) {
        currentValue = [currentValue];
      }
      currentValue.push(value);
      result[key] = currentValue;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * This hook returns the query object from the router. It is an attempt to
 * keep the original query object from the old useRouter hook.
 * At least until everything is properly migrated to the new router.
 * @returns {Object} routerQuery
 */
export const useRouterQuery = () => {
  const searchParams = useCompatSearchParams();
  let routerQuery = fromEntriesWithDuplicateKeys(searchParams?.entries() ?? [].values());

  // In embed iframe contexts (e.g., inline embeds), Next.js's useSearchParams() may not
  // properly reflect URL parameters. This occurs because the iframe's URL is set dynamically
  // by the embed script, and React's hydration may not pick up the search params correctly.
  // We fall back to window.location.search to ensure URL parameters are always accessible,
  // which is essential for features like "Disable input if prefilled" to work correctly.
  if (typeof window !== "undefined" && window.location.pathname.includes("/embed")) {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const windowQuery = fromEntriesWithDuplicateKeys(urlSearchParams.entries());

    routerQuery = Object.keys(routerQuery).length === 0 ? windowQuery : { ...routerQuery, ...windowQuery };
  }

  return routerQuery;
};
