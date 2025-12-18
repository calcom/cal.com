import { useCallback, useSyncExternalStore } from "react";

const getServerSnapshot = () => {
  // Return undefined during SSR to avoid hydration mismatches
  return undefined;
};

const useMediaQuery = (query: string) => {
  // Use useSyncExternalStore for SSR-safe media query detection
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const matches = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Return false if undefined (SSR) to maintain backward compatibility
  return matches ?? false;
};

export default useMediaQuery;
