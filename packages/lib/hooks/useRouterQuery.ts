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

type UseRouterQueryOptions = {
  /**
   * When true, reads query parameters directly from window.location.search instead of
   * relying on React's router state. This is useful in contexts where the URL is set
   * dynamically (e.g., iframes) and React's hydration may not properly reflect the
   * actual URL parameters. Essential for features like "Disable input if prefilled"
   * to work correctly in embed contexts.
   */
  forceWindowLocationParams?: boolean;
};

/**
 * This hook returns the query object from the router. It is an attempt to
 * keep the original query object from the old useRouter hook.
 * At least until everything is properly migrated to the new router.
 * @returns {Object} routerQuery
 */
export const useRouterQuery = (options: UseRouterQueryOptions = {}) => {
  const { forceWindowLocationParams = false } = options;
  const searchParams = useCompatSearchParams();
  let routerQuery = fromEntriesWithDuplicateKeys(searchParams?.entries() ?? [].values());

  if (forceWindowLocationParams && typeof window !== "undefined") {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const windowQuery = fromEntriesWithDuplicateKeys(urlSearchParams.entries());

    routerQuery = Object.keys(routerQuery).length === 0 ? windowQuery : { ...routerQuery, ...windowQuery };
  }

  return routerQuery;
};
