import { useRouter } from "next/router";
import { useMemo } from "react";

export function useRouterAsPath() {
  const router = useRouter();
  return useMemo(() => {
    return router.asPath.split("?")[0] as string;
  }, [router.asPath]);
}

export function useRouterBasePath() {
  const router = useRouter();
  return useMemo(() => {
    const path = router.asPath.split("/");

    // For teams
    if (path.length > 3) {
      return `${path[1]}/${path[2]}`;
    }

    return path[1] as string;
  }, [router.asPath]);
}
