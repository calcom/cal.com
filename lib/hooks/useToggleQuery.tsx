import { useRouter } from "next/router";
import { useMemo } from "react";

export function useToggleQuery(name: string) {
  const router = useRouter();

  const hrefOff = useMemo(() => {
    const query = {
      ...router.query,
    };
    delete query[name];
    return {
      query,
    };
  }, [router.query, name]);
  const hrefOn = useMemo(() => {
    const query = {
      ...router.query,
      [name]: "1",
    };
    return {
      query,
    };
  }, [router.query, name]);

  return {
    hrefOn,
    hrefOff,
    isOn: router.query[name] === "1",
  };
}
