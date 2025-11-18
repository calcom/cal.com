"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { getCookie, setCookie } from "@calcom/lib/cookie";

import { useGeolocation } from "./geolocation";

export interface GoogleAdsData {
  gclid: string;
  campaignId?: string;
}

/**
 * Automatically capture gclid and campaign ID from URL parameters
 */
export function useGoogleAdsCapture(): void {
  const searchParams = useSearchParams();
  const { isUS, loading } = useGeolocation();

  useEffect(() => {
    if (!isUS || loading || !searchParams) {
      return;
    }

    try {
      const gclid = searchParams.get("gclid");

      if (gclid) {
        const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
        const domain = isLocalhost ? "" : "domain=.cal.com; ";
        const cookieOptions = `${domain}path=/; max-age=31536000000; ${isLocalhost ? "" : "secure; "
          }samesite=lax`;
        setCookie("gclid", gclid, cookieOptions);

        const campaignId = searchParams.get("gad_campaignid");
        if (campaignId) {
          setCookie("campaignId", campaignId, cookieOptions);
        }
      }
    } catch (error) {
      console.error("[Google Ads] Error capturing data:", error);
    }
  }, [searchParams, isUS, loading]);
}

export function getGoogleAdsData(): GoogleAdsData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const gclid = getCookie("gclid");

    if (!gclid) {
      return null;
    }

    const campaignId = getCookie("campaignId");

    return {
      gclid,
      campaignId: campaignId || undefined,
    };
  } catch (error) {
    console.error("[Google Ads] Error retrieving data:", error);
    return null;
  }
}
