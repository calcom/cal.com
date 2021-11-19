import { useRouter } from "next/router";
import { useMemo } from "react";

/**
 * Used for pages where edge functions
 */
export function useRouterAsPath() {
  const router = useRouter();
  return useMemo(() => {
    return router.asPath.split("?")[0] as string;
  }, [router.asPath]);
}
