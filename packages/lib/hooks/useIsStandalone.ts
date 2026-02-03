"use client";

import { useSearchParams } from "next/navigation";

export const useIsStandalone = () => {
  const searchParams = useSearchParams();
  return searchParams?.get("standalone") === "true";
};
