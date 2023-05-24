import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useToggleQuery(name: string) {
  const searchParams = useSearchParams();

  const hrefOff = useMemo(() => {
    const query = {
      ...Object.fromEntries(searchParams ?? new URLSearchParams()),
    };
    delete query[name];
    return {
      query,
    };
  }, [searchParams, name]);
  const hrefOn = useMemo(() => {
    const query = {
      ...Object.fromEntries(searchParams ?? new URLSearchParams()),
      [name]: "1",
    };
    return {
      query,
    };
  }, [searchParams, name]);

  return {
    hrefOn,
    hrefOff,
    isOn: searchParams?.get(name) === "1",
  };
}
