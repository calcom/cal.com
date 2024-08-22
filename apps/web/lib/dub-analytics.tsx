import { Analytics } from "@dub/analytics/react";
import { headers } from "next/headers";
import { Suspense } from "react";

import { IS_CALCOM, WEBAPP_URL } from "@calcom/lib/constants";
import { isENVDev } from "@calcom/lib/env";

const EU_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

const DubAnalyticsRSC = () => {
  const countryCode = headers().get("x-vercel-ip-country") || "US";

  /* Don't show the script if:
    1. it's not either:
        - dev mode
        - the hosted version of Cal.com
    2. the user is in the EU
  */
  if (!(isENVDev || IS_CALCOM) || EU_COUNTRY_CODES.includes(countryCode)) {
    return null;
  }

  return (
    <Analytics
      cookieOptions={{
        domain: isENVDev ? undefined : new URL(WEBAPP_URL).hostname,
      }}
    />
  );
};

export const DubAnalytics = () => {
  return (
    <Suspense fallback={null}>
      <DubAnalyticsRSC />
    </Suspense>
  );
};
