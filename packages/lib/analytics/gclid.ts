"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { localStorage } from "@calcom/lib/webstorage";

const GCLID_STORAGE_KEY = "gclid";
const GCLID_EXPIRY_KEY = "gclid_expiry";
const GCLID_EXPIRY_DAYS = 90; // Google Ads attribution window

function storeGclid(gclid: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + GCLID_EXPIRY_DAYS);

    localStorage.setItem(GCLID_STORAGE_KEY, gclid);
    localStorage.setItem(GCLID_EXPIRY_KEY, expiryDate.getTime().toString());
  } catch (error) {
    console.error("[Google Ads] Error storing gclid:", error);
  }
}

/**
 * Automatically capture gclid from URL parameters
 *
 */
export function useGclidCapture(): void {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    try {
      const gclid = searchParams.get("gclid");

      if (gclid) {
        storeGclid(gclid);
      }
    } catch (error) {
      console.error("[Google Ads] Error capturing gclid:", error);
    }
  }, [searchParams]);
}

export function getGclid(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const gclid = localStorage.getItem(GCLID_STORAGE_KEY);
    const expiryTimestamp = localStorage.getItem(GCLID_EXPIRY_KEY);

    if (!gclid || !expiryTimestamp) {
      return null;
    }

    const expiryDate = new Date(parseInt(expiryTimestamp, 10));
    const now = new Date();

    if (now > expiryDate) {
      localStorage.removeItem(GCLID_STORAGE_KEY);
      localStorage.removeItem(GCLID_EXPIRY_KEY);
      return null;
    }

    return gclid;
  } catch (error) {
    console.error("[Google Ads] Error retrieving gclid:", error);
    return null;
  }
}

export function clearGclid(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(GCLID_STORAGE_KEY);
    localStorage.removeItem(GCLID_EXPIRY_KEY);
  } catch (error) {
    console.error("[Google Ads] Error clearing gclid:", error);
  }
}
