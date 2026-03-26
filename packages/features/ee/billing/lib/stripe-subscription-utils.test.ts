import { describe, expect, it } from "vitest";

import type { BillingPeriod } from "@calcom/prisma/enums";

import {
  extractBillingDataFromStripeSubscription,
  type StripeSubscriptionLike,
} from "./stripe-subscription-utils";

describe("stripe-subscription-utils", () => {
  describe("extractBillingDataFromStripeSubscription", () => {
    const createSubscription = (overrides: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike => ({
      items: [
        {
          id: "item-1",
          quantity: 10,
          price: {
            unit_amount: 1500,
            recurring: { interval: "month" },
          },
        },
      ],
      current_period_start: 1672531200, // Jan 1, 2023 00:00:00 UTC
      current_period_end: 1675209600, // Feb 1, 2023 00:00:00 UTC
      trial_end: null,
      ...overrides,
    });

    describe("billing period extraction", () => {
      it("should extract MONTHLY billing period for month interval", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 10,
              price: {
                unit_amount: 1500,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.billingPeriod).toBe("MONTHLY" as BillingPeriod);
      });

      it("should extract ANNUALLY billing period for year interval", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 10,
              price: {
                unit_amount: 18000,
                recurring: { interval: "year" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.billingPeriod).toBe("ANNUALLY" as BillingPeriod);
      });

      it("should default to MONTHLY for other intervals", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 10,
              price: {
                unit_amount: 1500,
                recurring: { interval: "week" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.billingPeriod).toBe("MONTHLY" as BillingPeriod);
      });

      it("should handle null recurring", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 10,
              price: {
                unit_amount: 1500,
                recurring: null,
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.billingPeriod).toBe("MONTHLY" as BillingPeriod);
      });
    });

    describe("price per seat extraction", () => {
      it("should extract price per seat from primary item", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 10,
              price: {
                unit_amount: 2500,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.pricePerSeat).toBe(2500);
      });

      it("should handle null unit_amount", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 10,
              price: {
                unit_amount: null,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.pricePerSeat).toBeUndefined();
      });

      it("should handle zero unit_amount", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 10,
              price: {
                unit_amount: 0,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.pricePerSeat).toBe(0);
      });
    });

    describe("paid seats extraction", () => {
      it("should extract paid seats from primary item quantity", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 25,
              price: {
                unit_amount: 1500,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.paidSeats).toBe(25);
      });

      it("should handle null quantity", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: null,
              price: {
                unit_amount: 1500,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.paidSeats).toBeUndefined();
      });

      it("should handle zero quantity", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 0,
              price: {
                unit_amount: 1500,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.paidSeats).toBe(0);
      });
    });

    describe("subscription dates extraction", () => {
      it("should extract subscription start date", () => {
        const subscription = createSubscription({
          current_period_start: 1672531200, // Jan 1, 2023 00:00:00 UTC
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.subscriptionStart).toEqual(new Date("2023-01-01T00:00:00.000Z"));
      });

      it("should extract subscription end date", () => {
        const subscription = createSubscription({
          current_period_end: 1675209600, // Feb 1, 2023 00:00:00 UTC
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.subscriptionEnd).toEqual(new Date("2023-02-01T00:00:00.000Z"));
      });

      it("should extract trial end date when present", () => {
        const subscription = createSubscription({
          trial_end: 1673136000, // Jan 8, 2023 00:00:00 UTC
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.subscriptionTrialEnd).toEqual(new Date("2023-01-08T00:00:00.000Z"));
      });

      it("should handle null trial end", () => {
        const subscription = createSubscription({
          trial_end: null,
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.subscriptionTrialEnd).toBeUndefined();
      });
    });

    describe("items format handling", () => {
      it("should handle items as array format", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 5,
              price: {
                unit_amount: 1200,
                recurring: { interval: "month" },
              },
            },
            {
              id: "item-2",
              quantity: 3,
              price: {
                unit_amount: 800,
                recurring: { interval: "month" },
              },
            },
          ],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.paidSeats).toBe(5); // Uses first item
        expect(result.pricePerSeat).toBe(1200);
      });

      it("should handle items as object with data property", () => {
        const subscription = createSubscription({
          items: {
            data: [
              {
                id: "item-1",
                quantity: 7,
                price: {
                  unit_amount: 1800,
                  recurring: { interval: "year" },
                },
              },
            ],
          },
        } as any);

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.paidSeats).toBe(7);
        expect(result.pricePerSeat).toBe(1800);
        expect(result.billingPeriod).toBe("ANNUALLY" as BillingPeriod);
      });

      it("should handle empty items array", () => {
        const subscription = createSubscription({
          items: [],
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.paidSeats).toBeUndefined();
        expect(result.pricePerSeat).toBeUndefined();
        expect(result.billingPeriod).toBe("MONTHLY" as BillingPeriod); // Default fallback
      });

      it("should handle empty data array in object format", () => {
        const subscription = createSubscription({
          items: { data: [] },
        } as any);

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result.paidSeats).toBeUndefined();
        expect(result.pricePerSeat).toBeUndefined();
        expect(result.billingPeriod).toBe("MONTHLY" as BillingPeriod);
      });
    });

    describe("complete extraction scenario", () => {
      it("should extract all billing data correctly", () => {
        const subscription = createSubscription({
          items: [
            {
              id: "item-1",
              quantity: 15,
              price: {
                unit_amount: 2400,
                recurring: { interval: "year" },
              },
            },
          ],
          current_period_start: 1672531200, // Jan 1, 2023 00:00:00 UTC
          current_period_end: 1704067200, // Jan 1, 2024 00:00:00 UTC
          trial_end: 1673136000, // Jan 8, 2023 00:00:00 UTC
        });

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result).toEqual({
          billingPeriod: "ANNUALLY" as BillingPeriod,
          pricePerSeat: 2400,
          paidSeats: 15,
          subscriptionStart: new Date("2023-01-01T00:00:00.000Z"),
          subscriptionEnd: new Date("2024-01-01T00:00:00.000Z"),
          subscriptionTrialEnd: new Date("2023-01-08T00:00:00.000Z"),
        });
      });

      it("should handle minimal subscription data", () => {
        const subscription: StripeSubscriptionLike = {
          items: [],
          current_period_start: 0,
          current_period_end: 0,
          trial_end: null,
        };

        const result = extractBillingDataFromStripeSubscription(subscription);

        expect(result).toEqual({
          billingPeriod: "MONTHLY" as BillingPeriod,
          pricePerSeat: undefined,
          paidSeats: undefined,
          subscriptionStart: undefined, // 0 is falsy, so returns undefined
          subscriptionEnd: undefined, // 0 is falsy, so returns undefined
          subscriptionTrialEnd: undefined,
        });
      });
    });
  });
});
