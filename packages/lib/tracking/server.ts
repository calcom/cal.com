import type { NextApiRequest } from "next";

export type GoogleAdsTrackingData = {
  gclid: string;
  campaignId?: string;
};

export type TrackingData = {
  googleAds?: GoogleAdsTrackingData;
};


export function getTrackingFromCookies(cookies?: NextApiRequest["cookies"]): TrackingData {
  const tracking: TrackingData = {};

  if (!cookies) return tracking;

  if (process.env.GOOGLE_ADS_ENABLED && cookies.gclid) {
    tracking.googleAds = {
      gclid: cookies.gclid,
      ...(cookies.gad_campaignid && { campaignId: cookies.gad_campaignid }),
    };
  }

  return tracking;
}
