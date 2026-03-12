import type { NextApiRequest } from "next";
import { z } from "zod";

const utmTrackingDataSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  utm_id: z.string().optional(),
  utm_referral: z.string().optional(),
  landing_page: z.string().optional(),
});

export type TrackingData = Record<string, string | undefined>;

export function getTrackingFromCookies(
  cookies?: NextApiRequest["cookies"],
  query?: NextApiRequest["query"]
): TrackingData {
  const tracking: TrackingData = {};

  if (process.env.GOOGLE_ADS_ENABLED === "1" && cookies?.gclid) {
    tracking.gclid = cookies.gclid;
    if (cookies?.gad_campaignId) {
      tracking.campaignId = cookies.gad_campaignId;
    }
  }

  if (process.env.LINKEDIN_ADS_ENABLED === "1" && cookies?.li_fat_id) {
    tracking.liFatId = cookies.li_fat_id;
    if (cookies?.li_campaignId) {
      tracking.linkedInCampaignId = cookies.li_campaignId;
    }
  }

  const parseUtm = (input: unknown): Record<string, string> | null => {
    const parsed = utmTrackingDataSchema.safeParse(input);
    if (!parsed.success) return null;

    const entries = Object.entries(parsed.data).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    );
    if (entries.length === 0) return null;

    return Object.fromEntries(entries);
  };

  let utmData: Record<string, string> | null = null;

  if (query && Object.keys(query).length > 0) {
    utmData = parseUtm(query);
  }

  if (!utmData && cookies?.utm_data) {
    try {
      utmData = parseUtm(JSON.parse(cookies.utm_data));
    } catch {
      console.debug("Failed to parse utm_data cookie");
    }
  }

  if (utmData) {
    Object.assign(tracking, utmData);
  }

  return tracking;
}
