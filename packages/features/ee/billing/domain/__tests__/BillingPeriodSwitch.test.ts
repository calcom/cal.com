import { describe, expect, it } from "vitest";

import { BillingPeriodSwitch, BillingPeriodSwitchError } from "../BillingPeriodSwitch";

describe("BillingPeriodSwitch", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  describe("canSwitchTo", () => {
    it("allows upgrade from monthly to annual", () => {
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "MONTHLY", subscriptionId: "sub_1", subscriptionEnd: new Date("2026-07-01") },
        now
      );
      expect(sw.canSwitchTo("ANNUALLY")).toEqual({ allowed: true });
    });

    it("rejects when already on target period", () => {
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "ANNUALLY", subscriptionId: "sub_1", subscriptionEnd: new Date("2027-01-01") },
        now
      );
      expect(sw.canSwitchTo("ANNUALLY")).toEqual({ allowed: false, reason: "already_on_period" });
    });

    it("rejects when no subscription", () => {
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "MONTHLY", subscriptionId: null, subscriptionEnd: null },
        now
      );
      expect(sw.canSwitchTo("ANNUALLY")).toEqual({ allowed: false, reason: "no_subscription" });
    });

    it("allows downgrade to monthly within 30-day window", () => {
      const endDate = new Date("2026-07-01T00:00:00Z");
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "ANNUALLY", subscriptionId: "sub_1", subscriptionEnd: endDate },
        now
      );
      const result = sw.canSwitchTo("MONTHLY");
      expect(result.allowed).toBe(true);
      expect(result.switchDate).toEqual(endDate);
    });

    it("rejects downgrade to monthly outside 30-day window", () => {
      const endDate = new Date("2026-12-01T00:00:00Z");
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "ANNUALLY", subscriptionId: "sub_1", subscriptionEnd: endDate },
        now
      );
      const result = sw.canSwitchTo("MONTHLY");
      expect(result.allowed).toBe(false);
      expect(result).toHaveProperty("reason", "outside_downgrade_window");
      expect(result.switchDate).toEqual(endDate);
    });

    it("rejects downgrade when subscription already ended", () => {
      const endDate = new Date("2026-06-01T00:00:00Z");
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "ANNUALLY", subscriptionId: "sub_1", subscriptionEnd: endDate },
        now
      );
      const result = sw.canSwitchTo("MONTHLY");
      expect(result.allowed).toBe(false);
      expect(result).toHaveProperty("reason", "outside_downgrade_window");
    });

    it("rejects downgrade when no subscription end date", () => {
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "ANNUALLY", subscriptionId: "sub_1", subscriptionEnd: null },
        now
      );
      const result = sw.canSwitchTo("MONTHLY");
      expect(result.allowed).toBe(false);
      expect(result).toHaveProperty("reason", "outside_downgrade_window");
    });
  });

  describe("planSwitchTo", () => {
    it("returns immediate plan with proration for upgrade", () => {
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "MONTHLY", subscriptionId: "sub_1", subscriptionEnd: new Date("2026-07-01") },
        now
      );
      expect(sw.planSwitchTo("ANNUALLY")).toEqual({
        targetPeriod: "ANNUALLY",
        prorationBehavior: "create_prorations",
        isImmediate: true,
      });
    });

    it("returns scheduled plan without proration for downgrade", () => {
      const endDate = new Date("2026-07-01T00:00:00Z");
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "ANNUALLY", subscriptionId: "sub_1", subscriptionEnd: endDate },
        now
      );
      expect(sw.planSwitchTo("MONTHLY")).toEqual({
        targetPeriod: "MONTHLY",
        prorationBehavior: "none",
        isImmediate: false,
        effectiveDate: endDate,
      });
    });

    it("throws BillingPeriodSwitchError when not allowed", () => {
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "ANNUALLY", subscriptionId: "sub_1", subscriptionEnd: new Date("2026-12-01") },
        now
      );
      expect(() => sw.planSwitchTo("MONTHLY")).toThrow(BillingPeriodSwitchError);
      expect(() => sw.planSwitchTo("MONTHLY")).toThrow("outside the 30-day window");
    });

    it("throws when already on target period", () => {
      const sw = new BillingPeriodSwitch(
        { billingPeriod: "MONTHLY", subscriptionId: "sub_1", subscriptionEnd: new Date("2026-07-01") },
        now
      );
      expect(() => sw.planSwitchTo("MONTHLY")).toThrow(BillingPeriodSwitchError);
      expect(() => sw.planSwitchTo("MONTHLY")).toThrow("Already on the target billing period");
    });
  });
});
