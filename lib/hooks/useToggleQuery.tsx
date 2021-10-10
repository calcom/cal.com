import { useRouter } from "next/router";
import { useMemo } from "react";

export function useToggleQuery(name: string, opts: { zero?: boolean } = {}) {
  const router = useRouter();

  const makeHref = (value: "0" | "1") => {
    const query = {
      ...router.query,
      [name]: value,
    };
    if (!opts.zero && value !== "1") delete query[name];
    return { query };
  };

  const hrefOff = useMemo(() => makeHref("0"), [router.query, name, opts.zero]);
  const hrefOn = useMemo(() => makeHref("1"), [router.query, name]);

  return {
    hrefOn,
    hrefOff,
    isOn: router.query[name] === "1",
  };
}
