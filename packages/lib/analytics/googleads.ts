"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { localStorage } from "@calcom/lib/webstorage";

import { useGeolocation } from "./geolocation";

const GOOGLE_ADS_STORAGE_KEY = "google_ads_data";

export interface GoogleAdsData {
  gclid: string;
  campaignId?: string;
}

function storeGoogleAdsData(data: GoogleAdsData): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(GOOGLE_ADS_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("[Google Ads] Error storing data:", error);
  }
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
        // Get campaign ID from Google Ads parameter
        const campaignId = searchParams.get("gad_campaignid") || undefined;

        storeGoogleAdsData({
          gclid,
          campaignId,
        });
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
    const data = localStorage.getItem(GOOGLE_ADS_STORAGE_KEY);
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("[Google Ads] Error retrieving data:", error);
    return null;
  }
}
