import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { getTrackingFromCookies } from "./server";

describe("getTrackingFromCookies", () => {
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
    it("returns gclid when GOOGLE_ADS_ENABLED and gclid cookie present", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      const cookies = { gclid: "test-gclid-123" };
      const result = getTrackingFromCookies(cookies);
      expect(result.gclid).toBe("test-gclid-123");
    });

    it("includes campaignId when gad_campaignId cookie present", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      const cookies = { gclid: "test-gclid", gad_campaignId: "campaign-456" };
      const result = getTrackingFromCookies(cookies);
      expect(result.gclid).toBe("test-gclid");
      expect(result.campaignId).toBe("campaign-456");
    });

    it("does not return gclid when GOOGLE_ADS_ENABLED is not 1", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "0");
      const cookies = { gclid: "test-gclid" };
      const result = getTrackingFromCookies(cookies);
      expect(result.gclid).toBeUndefined();
    });

    it("does not return gclid when gclid cookie is missing", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      const result = getTrackingFromCookies({});
      expect(result.gclid).toBeUndefined();
    });
  });

  describe("LinkedIn Ads tracking", () => {
    it("returns liFatId when LINKEDIN_ADS_ENABLED and li_fat_id cookie present", () => {
      vi.stubEnv("LINKEDIN_ADS_ENABLED", "1");
      const cookies = { li_fat_id: "test-li-fat-id" };
      const result = getTrackingFromCookies(cookies);
      expect(result.liFatId).toBe("test-li-fat-id");
    });

    it("includes linkedInCampaignId when li_campaignId cookie present", () => {
      vi.stubEnv("LINKEDIN_ADS_ENABLED", "1");
      const cookies = { li_fat_id: "test-li", li_campaignId: "li-campaign-789" };
      const result = getTrackingFromCookies(cookies);
      expect(result.liFatId).toBe("test-li");
      expect(result.linkedInCampaignId).toBe("li-campaign-789");
    });

    it("does not return liFatId when LINKEDIN_ADS_ENABLED is not 1", () => {
      const cookies = { li_fat_id: "test-li" };
      const result = getTrackingFromCookies(cookies);
      expect(result.liFatId).toBeUndefined();
    });
  });

  describe("UTM tracking", () => {
    it("parses UTM data from query parameters", () => {
      const query = { utm_source: "google", utm_medium: "cpc", utm_campaign: "summer" };
      const result = getTrackingFromCookies({}, query);
      expect(result.utm_source).toBe("google");
      expect(result.utm_medium).toBe("cpc");
      expect(result.utm_campaign).toBe("summer");
    });

    it("filters out undefined UTM values", () => {
      const query = { utm_source: "google" };
      const result = getTrackingFromCookies({}, query);
      expect(result.utm_source).toBe("google");
      expect(result).not.toHaveProperty("utm_medium");
    });

    it("falls back to utm_data cookie when query is empty", () => {
      const cookies = {
        utm_data: JSON.stringify({ utm_source: "newsletter", utm_medium: "email" }),
      };
      const result = getTrackingFromCookies(cookies);
      expect(result.utm_source).toBe("newsletter");
      expect(result.utm_medium).toBe("email");
    });

    it("prefers query over cookie when both present", () => {
      const cookies = {
        utm_data: JSON.stringify({ utm_source: "cookie-source" }),
      };
      const query = { utm_source: "query-source" };
      const result = getTrackingFromCookies(cookies, query);
      expect(result.utm_source).toBe("query-source");
    });

    it("handles malformed utm_data cookie gracefully", () => {
      const cookies = { utm_data: "not-valid-json" };
      const result = getTrackingFromCookies(cookies);
      expect(result.utm_source).toBeUndefined();
    });

    it("handles empty query object", () => {
      const cookies = {
        utm_data: JSON.stringify({ utm_source: "fallback" }),
      };
      const result = getTrackingFromCookies(cookies, {});
      expect(result.utm_source).toBe("fallback");
    });

    it("does not set utm keys when query has no UTM params", () => {
      const query = { other_param: "value" };
      const result = getTrackingFromCookies({}, query);
      expect(result.utm_source).toBeUndefined();
    });
  });

  describe("combined tracking", () => {
    it("returns all tracking data when all sources present", () => {
      vi.stubEnv("GOOGLE_ADS_ENABLED", "1");
      vi.stubEnv("LINKEDIN_ADS_ENABLED", "1");
      const cookies = { gclid: "gclid-1", li_fat_id: "li-1" };
      const query = { utm_source: "combined" };
      const result = getTrackingFromCookies(cookies, query);
      expect(result.gclid).toBe("gclid-1");
      expect(result.liFatId).toBe("li-1");
      expect(result.utm_source).toBe("combined");
    });
  });
});
