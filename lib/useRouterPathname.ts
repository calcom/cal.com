import { useRouter } from "next/router";
import { useMemo } from "react";

export function useRouterPathname() {
  const router = useRouter();
  return useMemo(() => {
    return router.asPath.split("?")[0] as string;
  }, [router.asPath]);
}
