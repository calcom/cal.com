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
  let routerQuery = fromEntriesWithDuplicateKeys(searchParams?.entries() ?? null);

  // In embed contexts, useSearchParams might not properly reflect URL params
  // Fall back to window.location.search if we're in an embed and have no params
  if (typeof window !== "undefined" && window.location.search) {
    const isEmbed = window.location.pathname.includes("/embed");
    const hasNoParams = Object.keys(routerQuery).length === 0;

    if (isEmbed && hasNoParams) {
      const urlSearchParams = new URLSearchParams(window.location.search);
      routerQuery = fromEntriesWithDuplicateKeys(urlSearchParams.entries());
    } else if (isEmbed) {
      // Even if we have some params, merge with window.location.search to ensure we have all
      const urlSearchParams = new URLSearchParams(window.location.search);
      const windowQuery = fromEntriesWithDuplicateKeys(urlSearchParams.entries());
      // Merge window query params with priority (they represent the actual URL)
      routerQuery = { ...routerQuery, ...windowQuery };
    }
  }

  return routerQuery;
};
