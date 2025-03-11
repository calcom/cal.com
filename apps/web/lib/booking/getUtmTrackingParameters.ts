import type { ReadonlyURLSearchParams } from "next/navigation";

export function getUtmTrackingParameters(searchParams: ReadonlyURLSearchParams | null) {
  if (!searchParams) return {};

  const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  const tracking = Object.fromEntries(
    utmParams.map((param) => [param, searchParams?.get(param) ?? undefined])
  );

  return tracking;
}
