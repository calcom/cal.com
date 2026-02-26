import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { getTrackingFromCookies } from "./server";

describe("getTrackingFromCookies", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.stubEnv("GOOGLE_ADS_ENABLED", "");
    vi.stubEnv("LINKEDIN_ADS_ENABLED", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty tracking when no cookies or query", () => {
    const result = getTrackingFromCookies();
    expect(result).toEqual({});
  });

  it("returns empty tracking when cookies are empty", () => {
    const result = getTrackingFromCookies({});
    expect(result).toEqual({});
  });

  describe("Google Ads tracking", () => {
    it("returns googleAds when GOOGLE_ADS_ENABLED and gclid cookie present", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      const cookies = { gclid: "test-gclid-123" };
      const result = getTrackingFromCookies(cookies);
      expect(result.googleAds).toEqual({ gclid: "test-gclid-123" });
    });

    it("includes campaignId when gad_campaignId cookie present", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      const cookies = { gclid: "test-gclid", gad_campaignId: "campaign-456" };
      const result = getTrackingFromCookies(cookies);
      expect(result.googleAds).toEqual({ gclid: "test-gclid", campaignId: "campaign-456" });
    });

    it("does not return googleAds when GOOGLE_ADS_ENABLED is not 1", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "0");
      const cookies = { gclid: "test-gclid" };
      const result = getTrackingFromCookies(cookies);
      expect(result.googleAds).toBeUndefined();
    });

    it("does not return googleAds when gclid cookie is missing", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      const result = getTrackingFromCookies({});
      expect(result.googleAds).toBeUndefined();
    });
  });

  describe("LinkedIn Ads tracking", () => {
    it("returns linkedInAds when LINKEDIN_ADS_ENABLED and li_fat_id cookie present", () => {
      vi.stubEnv("LINKEDIN_ADS_ENABLED", "1");
      const cookies = { li_fat_id: "test-li-fat-id" };
      const result = getTrackingFromCookies(cookies);
      expect(result.linkedInAds).toEqual({ liFatId: "test-li-fat-id" });
    });

    it("includes campaignId when li_campaignId cookie present", () => {
      vi.stubEnv("LINKEDIN_ADS_ENABLED", "1");
      const cookies = { li_fat_id: "test-li", li_campaignId: "li-campaign-789" };
      const result = getTrackingFromCookies(cookies);
      expect(result.linkedInAds).toEqual({ liFatId: "test-li", campaignId: "li-campaign-789" });
    });

    it("does not return linkedInAds when LINKEDIN_ADS_ENABLED is not 1", () => {
      const cookies = { li_fat_id: "test-li" };
      const result = getTrackingFromCookies(cookies);
      expect(result.linkedInAds).toBeUndefined();
    });
  });

  describe("UTM tracking", () => {
    it("parses UTM data from query parameters", () => {
      const query = { utm_source: "google", utm_medium: "cpc", utm_campaign: "summer" };
      const result = getTrackingFromCookies({}, query);
      expect(result.utmData).toEqual({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "summer",
      });
    });

    it("filters out undefined UTM values", () => {
      const query = { utm_source: "google" };
      const result = getTrackingFromCookies({}, query);
      expect(result.utmData).toEqual({ utm_source: "google" });
      expect(result.utmData).not.toHaveProperty("utm_medium");
    });

    it("falls back to utm_data cookie when query is empty", () => {
      const cookies = {
        utm_data: JSON.stringify({ utm_source: "newsletter", utm_medium: "email" }),
      };
      const result = getTrackingFromCookies(cookies);
      expect(result.utmData).toEqual({ utm_source: "newsletter", utm_medium: "email" });
    });

    it("prefers query over cookie when both present", () => {
      const cookies = {
        utm_data: JSON.stringify({ utm_source: "cookie-source" }),
      };
      const query = { utm_source: "query-source" };
      const result = getTrackingFromCookies(cookies, query);
      expect(result.utmData?.utm_source).toBe("query-source");
    });

    it("handles malformed utm_data cookie gracefully", () => {
      const cookies = { utm_data: "not-valid-json" };
      const result = getTrackingFromCookies(cookies);
      expect(result.utmData).toBeUndefined();
    });

    it("handles empty query object", () => {
      const cookies = {
        utm_data: JSON.stringify({ utm_source: "fallback" }),
      };
      const result = getTrackingFromCookies(cookies, {});
      expect(result.utmData).toEqual({ utm_source: "fallback" });
    });

    it("returns empty utmData object when query has no UTM params", () => {
      const query = { other_param: "value" };
      const result = getTrackingFromCookies({}, query);
      // Zod schema strips unknown keys, so parseUtm returns {} which is truthy
      expect(result.utmData).toEqual({});
    });
  });

  describe("combined tracking", () => {
    it("returns all tracking data when all sources present", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      vi.stubEnv("LINKEDIN_ADS_ENABLED", "1");
      const cookies = { gclid: "gclid-1", li_fat_id: "li-1" };
      const query = { utm_source: "combined" };
      const result = getTrackingFromCookies(cookies, query);
      expect(result.googleAds).toBeDefined();
      expect(result.linkedInAds).toBeDefined();
      expect(result.utmData).toBeDefined();
    });
  });
});
