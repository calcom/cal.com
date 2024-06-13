import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export const useRedirectIfPlatformUser = async (isPlatformUser?: boolean) => {
  const router = useRouter();
  const pathName = usePathname();

  useEffect(() => {
    if (isPlatformUser === true && pathName && !pathName.startsWith("/settings/platform")) {
      return router.replace("/settings/platform");
    }
  }, [isPlatformUser, pathName, router]);
};
