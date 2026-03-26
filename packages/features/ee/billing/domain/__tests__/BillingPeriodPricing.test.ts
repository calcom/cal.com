import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BillingPeriodPricing } from "../BillingPeriodPricing";

describe("BillingPeriodPricing", () => {
  let billingPeriodPricing: BillingPeriodPricing;
  let originalEnv: NodeJS.ProcessEnv;

  // Mock environment variables
  const mockEnvVars = {
    STRIPE_ORG_MONTHLY_PRICE_ID: "price_org_monthly_123",
    STRIPE_ORG_ANNUAL_PRICE_ID: "price_org_annual_456",
    STRIPE_TEAM_MONTHLY_PRICE_ID: "price_team_monthly_789",
    STRIPE_TEAM_ANNUAL_PRICE_ID: "price_team_annual_012",
  };

  beforeEach(() => {
    billingPeriodPricing = new BillingPeriodPricing();

    // Save original environment
    originalEnv = { ...process.env };

    // Mock all environment variables
    vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", mockEnvVars.STRIPE_ORG_MONTHLY_PRICE_ID);
    vi.stubEnv("STRIPE_ORG_ANNUAL_PRICE_ID", mockEnvVars.STRIPE_ORG_ANNUAL_PRICE_ID);
    vi.stubEnv("STRIPE_TEAM_MONTHLY_PRICE_ID", mockEnvVars.STRIPE_TEAM_MONTHLY_PRICE_ID);
    vi.stubEnv("STRIPE_TEAM_ANNUAL_PRICE_ID", mockEnvVars.STRIPE_TEAM_ANNUAL_PRICE_ID);
  });

  afterEach(() => {
    // Restore original environment
    vi.unstubAllEnvs();
  });

  describe("resolve", () => {
    describe("for organizations", () => {
      it("returns correct pricing for MONTHLY period", () => {
        const result = billingPeriodPricing.resolve("MONTHLY", true);

        expect(result).toEqual({
          priceId: mockEnvVars.STRIPE_ORG_MONTHLY_PRICE_ID,
          pricePerSeat: 3700, // ORGANIZATIONS monthly price from constants
        });
      });

      it("returns correct pricing for ANNUALLY period", () => {
        const result = billingPeriodPricing.resolve("ANNUALLY", true);

        expect(result).toEqual({
          priceId: mockEnvVars.STRIPE_ORG_ANNUAL_PRICE_ID,
          pricePerSeat: 2800, // ORGANIZATIONS annual price from constants
        });
      });
    });

    describe("for teams", () => {
      it("returns correct pricing for MONTHLY period", () => {
        const result = billingPeriodPricing.resolve("MONTHLY", false);

        expect(result).toEqual({
          priceId: mockEnvVars.STRIPE_TEAM_MONTHLY_PRICE_ID,
          pricePerSeat: 1600, // TEAMS monthly price from constants
        });
      });

      it("returns correct pricing for ANNUALLY period", () => {
        const result = billingPeriodPricing.resolve("ANNUALLY", false);

        expect(result).toEqual({
          priceId: mockEnvVars.STRIPE_TEAM_ANNUAL_PRICE_ID,
          pricePerSeat: 1200, // TEAMS annual price from constants
        });
      });
    });
  });

  describe("when environment variables are missing", () => {
    beforeEach(() => {
      // Clear all environment variables by deleting them
      vi.unstubAllEnvs();
      delete process.env.STRIPE_ORG_MONTHLY_PRICE_ID;
      delete process.env.STRIPE_ORG_ANNUAL_PRICE_ID;
      delete process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
      delete process.env.STRIPE_TEAM_ANNUAL_PRICE_ID;
    });

    it("returns null priceId for organization monthly when env var is missing", () => {
      const result = billingPeriodPricing.resolve("MONTHLY", true);

      expect(result).toEqual({
        priceId: null,
        pricePerSeat: 3700,
      });
    });

    it("returns null priceId for organization annual when env var is missing", () => {
      const result = billingPeriodPricing.resolve("ANNUALLY", true);

      expect(result).toEqual({
        priceId: null,
        pricePerSeat: 2800,
      });
    });

    it("returns null priceId for team monthly when env var is missing", () => {
      const result = billingPeriodPricing.resolve("MONTHLY", false);

      expect(result).toEqual({
        priceId: null,
        pricePerSeat: 1600,
      });
    });

    it("returns null priceId for team annual when env var is missing", () => {
      const result = billingPeriodPricing.resolve("ANNUALLY", false);

      expect(result).toEqual({
        priceId: null,
        pricePerSeat: 1200,
      });
    });
  });

  describe("edge cases with partial environment variables", () => {
    it("handles case where only some org env vars are set", () => {
      vi.unstubAllEnvs();
      delete process.env.STRIPE_ORG_MONTHLY_PRICE_ID;
      delete process.env.STRIPE_ORG_ANNUAL_PRICE_ID;
      delete process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
      delete process.env.STRIPE_TEAM_ANNUAL_PRICE_ID;

      vi.stubEnv("STRIPE_ORG_MONTHLY_PRICE_ID", "org_monthly_only");

      expect(billingPeriodPricing.resolve("MONTHLY", true)).toEqual({
        priceId: "org_monthly_only",
        pricePerSeat: 3700,
      });

      expect(billingPeriodPricing.resolve("ANNUALLY", true)).toEqual({
        priceId: null,
        pricePerSeat: 2800,
      });
    });

    it("handles case where only some team env vars are set", () => {
      vi.unstubAllEnvs();
      delete process.env.STRIPE_ORG_MONTHLY_PRICE_ID;
      delete process.env.STRIPE_ORG_ANNUAL_PRICE_ID;
      delete process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;
      delete process.env.STRIPE_TEAM_ANNUAL_PRICE_ID;

      vi.stubEnv("STRIPE_TEAM_ANNUAL_PRICE_ID", "team_annual_only");

      expect(billingPeriodPricing.resolve("MONTHLY", false)).toEqual({
        priceId: null,
        pricePerSeat: 1600,
      });

      expect(billingPeriodPricing.resolve("ANNUALLY", false)).toEqual({
        priceId: "team_annual_only",
        pricePerSeat: 1200,
      });
    });
  });
});
