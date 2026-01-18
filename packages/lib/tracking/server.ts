import type { NextApiRequest } from "next";

export type GoogleAdsTrackingData = {
  gclid: string;
  campaignId?: string;
};

export type LinkedInAdsTrackingData = {
  liFatId: string;
  campaignId?: string;
};

export type TrackingData = {
  googleAds?: GoogleAdsTrackingData;
  linkedInAds?: LinkedInAdsTrackingData;
};


export function getTrackingFromCookies(cookies?: NextApiRequest["cookies"]): TrackingData {
  const tracking: TrackingData = {};

  if (!cookies) return tracking;

  if (process.env.GOOGLE_ADS_ENABLED === "1" && cookies.gclid) {
    tracking.googleAds = {
      gclid: cookies.gclid,
      ...(cookies.gad_campaignId && { campaignId: cookies.gad_campaignId }),
    };
  }

  if (process.env.LINKEDIN_ADS_ENABLED === "1" && cookies.li_fat_id) {
    tracking.linkedInAds = {
      liFatId: cookies.li_fat_id,
      ...(cookies.li_campaignId && { campaignId: cookies.li_campaignId }),
    };
  }

  return tracking;
}
