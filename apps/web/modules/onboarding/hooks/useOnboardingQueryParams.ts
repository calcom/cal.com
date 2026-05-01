"use client";

import { useSearchParams } from "next/navigation";

export const useOnboardingQueryParams = () => {
  const searchParams = useSearchParams();

  const bpParam = searchParams?.get("bp");
  const billingPeriod = bpParam === "a" ? ("ANNUALLY" as const) : ("MONTHLY" as const);

  const getQueryString = () => {
    const migrateParam = searchParams?.get("migrate");
    const queryParams = new URLSearchParams();
    if (migrateParam) queryParams.set("migrate", migrateParam);
    if (bpParam) queryParams.set("bp", bpParam);
    return queryParams.toString() ? `?${queryParams.toString()}` : "";
  };

  return { billingPeriod, getQueryString };
};
