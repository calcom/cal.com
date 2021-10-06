import { useRouter } from "next/router";
import { useCallback } from "react";

export function useToggleQuery(name: string) {
  const router = useRouter();

  const hrefOff = useCallback(() => {
    const query = {
      ...router.query,
    };
    delete query[name];
    return {
      query,
    };
  }, [router.query, name]);
  const hrefOn = useCallback(
    (value = "1") => {
      const query = {
        ...router.query,
        [name]: value,
      };
      return {
        query,
      };
    },
    [router.query, name]
  );
  const rawValue = router.query[name];
  const value = rawValue && typeof rawValue === "string" ? rawValue : undefined;

  return {
    hrefOn,
    hrefOff,
    isOn: !!value,
    value,
  };
}
