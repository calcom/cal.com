import { useRouter } from "next/navigation";

import { useAsPath } from "./useAsPath";

/** @see https://www.joshwcomeau.com/nextjs/refreshing-server-side-props/ */
export function useRefreshData() {
  const router = useRouter();
  const asPath = useAsPath();
  const refreshData = () => {
    router.replace(asPath);
  };
  return refreshData;
}
