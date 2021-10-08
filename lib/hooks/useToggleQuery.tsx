import { useRouter } from "next/router";
import { useMemo } from "react";

export function useToggleQuery(name: string, opts: { zero?: boolean } = {}) {
  const router = useRouter();

  const hrefOff = useMemo(() => {
    const query = {
      ...router.query,
      [name]: "0",
    };
    if (!opts.zero) {
      delete query[name];
    }
    return {
      query,
    };
  }, [router.query, name, opts.zero]);
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
