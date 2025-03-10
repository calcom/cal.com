import type { ReadonlyURLSearchParams } from "next/navigation";

export const isBookingDryRun = (searchParams: URLSearchParams | ReadonlyURLSearchParams) => {
  return searchParams.get("cal.isBookingDryRun") === "true";
};
