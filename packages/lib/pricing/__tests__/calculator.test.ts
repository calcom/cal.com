import { describe, expect, it } from "vitest";

import { calculateVariablePrice, createPricingContext, formatPrice } from "../calculator";
import type { VariablePricingConfig, PricingRule } from "../types";

describe("calculateVariablePrice", () => {
  const baseConfig: VariablePricingConfig = {
    enabled: true,
    basePrice: 5000, // $50.00 in cents
    currency: "usd",
    rules: [],
  };

  it("should return base price when variable pricing is disabled", () => {
    const config = { ...baseConfig, enabled: false };
    const context = createPricingContext(
      1,
      new Date("2024-01-15T10:00:00"),
      new Date("2024-01-15T11:00:00"),
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    expect(result.totalPrice).toBe(5000);
    expect(result.basePrice).toBe(5000);
    expect(result.modifiers).toHaveLength(0);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toMatchObject({
      description: "Base price",
      amount: 5000,
      type: "base",
    });
  });

  it("should return base price when no rules are defined", () => {
    const config = { ...baseConfig, rules: [] };
    const context = createPricingContext(
      1,
      new Date("2024-01-15T10:00:00"),
      new Date("2024-01-15T11:00:00"),
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    expect(result.totalPrice).toBe(5000);
    expect(result.basePrice).toBe(5000);
    expect(result.modifiers).toHaveLength(0);
  });

  it("should apply duration-based absolute pricing", () => {
    const durationRule: PricingRule = {
      id: "duration-rule",
      type: "duration",
      enabled: true,
      priority: 10,
      description: "1-hour rate",
      condition: {
        minDuration: 45,
        maxDuration: 75,
      },
      price: 7500, // $75.00 for 1-hour sessions
    };

    const config = { ...baseConfig, rules: [durationRule] };
    const context = createPricingContext(
      1,
      new Date("2024-01-15T10:00:00"),
      new Date("2024-01-15T11:00:00"), // 60 minutes
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    expect(result.totalPrice).toBe(7500);
    expect(result.breakdown[0]).toMatchObject({
      description: "1-hour rate",
      amount: 7500,
      type: "base",
      ruleId: "duration-rule",
    });
  });

  it("should apply weekend surcharge", () => {
    const weekendRule: PricingRule = {
      id: "weekend-rule",
      type: "dayOfWeek",
      enabled: true,
      priority: 5,
      description: "Weekend surcharge",
      condition: {
        days: ["saturday", "sunday"],
      },
      priceModifier: {
        type: "surcharge",
        value: 1500, // $15.00 surcharge
      },
    };

    const config = { ...baseConfig, rules: [weekendRule] };
    const context = createPricingContext(
      1,
      new Date("2024-01-13T10:00:00"), // Saturday
      new Date("2024-01-13T11:00:00"),
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    expect(result.totalPrice).toBe(6500); // $50 + $15
    expect(result.modifiers).toHaveLength(1);
    expect(result.modifiers[0]).toMatchObject({
      description: "Weekend surcharge",
      amount: 1500,
      type: "surcharge",
      ruleId: "weekend-rule",
    });
  });

  it("should apply percentage-based discount", () => {
    const discountRule: PricingRule = {
      id: "early-bird-rule",
      type: "timeOfDay",
      enabled: true,
      priority: 5,
      description: "Early bird discount",
      condition: {
        startTime: "06:00",
        endTime: "09:00",
      },
      priceModifier: {
        type: "discount",
        value: 0,
        percentage: 20, // 20% discount
      },
    };

    const config = { ...baseConfig, rules: [discountRule] };
    const context = createPricingContext(
      1,
      new Date("2024-01-15T08:00:00"), // 8:00 AM
      new Date("2024-01-15T09:00:00"),
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    expect(result.totalPrice).toBe(4000); // $50 - 20% = $40
    expect(result.modifiers).toHaveLength(1);
    expect(result.modifiers[0]).toMatchObject({
      description: "Early bird discount",
      amount: -1000, // -$10
      type: "discount",
      ruleId: "early-bird-rule",
    });
  });

  it("should apply multiple rules with correct priority", () => {
    const rules: PricingRule[] = [
      {
        id: "duration-rule",
        type: "duration",
        enabled: true,
        priority: 10,
        description: "Long session pricing",
        condition: {
          minDuration: 90,
        },
        price: 10000, // $100 for long sessions
      },
      {
        id: "weekend-rule",
        type: "dayOfWeek",
        enabled: true,
        priority: 5,
        description: "Weekend surcharge",
        condition: {
          days: ["saturday", "sunday"],
        },
        priceModifier: {
          type: "surcharge",
          percentage: 25, // 25% weekend surcharge
        },
      },
      {
        id: "late-night-rule",
        type: "timeOfDay",
        enabled: true,
        priority: 3,
        description: "Late night surcharge",
        condition: {
          startTime: "20:00",
          endTime: "06:00",
        },
        priceModifier: {
          type: "surcharge",
          value: 2000, // $20 late night fee
        },
      },
    ];

    const config = { ...baseConfig, rules };
    const context = createPricingContext(
      1,
      new Date("2024-01-13T22:00:00"), // Saturday 10 PM
      new Date("2024-01-14T00:00:00"), // 2-hour session ending Sunday 12 AM
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    // Should be: $100 (duration) + 25% ($25) + $20 = $145
    expect(result.totalPrice).toBe(14500);
    expect(result.modifiers).toHaveLength(2);

    // Check weekend surcharge (25% of $100 = $25)
    expect(result.modifiers[0]).toMatchObject({
      description: "Weekend surcharge",
      amount: 2500,
      type: "surcharge",
    });

    // Check late night surcharge ($20)
    expect(result.modifiers[1]).toMatchObject({
      description: "Late night surcharge",
      amount: 2000,
      type: "surcharge",
    });
  });

  it("should handle overnight time ranges", () => {
    const overnightRule: PricingRule = {
      id: "overnight-rule",
      type: "timeOfDay",
      enabled: true,
      priority: 5,
      description: "Overnight hours",
      condition: {
        startTime: "22:00",
        endTime: "06:00",
      },
      priceModifier: {
        type: "surcharge",
        value: 1000,
      },
    };

    const config = { ...baseConfig, rules: [overnightRule] };

    // Test late night (should apply)
    const lateNightContext = createPricingContext(
      1,
      new Date("2024-01-15T23:00:00"),
      new Date("2024-01-16T00:00:00"),
      "UTC"
    );

    const lateNightResult = calculateVariablePrice(config, lateNightContext);
    expect(lateNightResult.totalPrice).toBe(6000); // $50 + $10

    // Test early morning (should apply)
    const earlyMorningContext = createPricingContext(
      1,
      new Date("2024-01-15T05:00:00"),
      new Date("2024-01-15T06:00:00"),
      "UTC"
    );

    const earlyMorningResult = calculateVariablePrice(config, earlyMorningContext);
    expect(earlyMorningResult.totalPrice).toBe(6000); // $50 + $10

    // Test midday (should not apply)
    const middayContext = createPricingContext(
      1,
      new Date("2024-01-15T14:00:00"),
      new Date("2024-01-15T15:00:00"),
      "UTC"
    );

    const middayResult = calculateVariablePrice(config, middayContext);
    expect(middayResult.totalPrice).toBe(5000); // $50 only
  });

  it("should ensure price never goes below zero", () => {
    const heavyDiscountRule: PricingRule = {
      id: "heavy-discount",
      type: "timeOfDay",
      enabled: true,
      priority: 5,
      description: "Heavy discount",
      condition: {
        startTime: "00:00",
        endTime: "23:59",
      },
      priceModifier: {
        type: "discount",
        value: 10000, // $100 discount (more than base price)
      },
    };

    const config = { ...baseConfig, rules: [heavyDiscountRule] };
    const context = createPricingContext(
      1,
      new Date("2024-01-15T10:00:00"),
      new Date("2024-01-15T11:00:00"),
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    expect(result.totalPrice).toBe(0); // Should not go negative
  });

  it("should skip disabled rules", () => {
    const disabledRule: PricingRule = {
      id: "disabled-rule",
      type: "timeOfDay",
      enabled: false, // Disabled
      priority: 5,
      description: "Should not apply",
      condition: {
        startTime: "00:00",
        endTime: "23:59",
      },
      priceModifier: {
        type: "surcharge",
        value: 1000,
      },
    };

    const config = { ...baseConfig, rules: [disabledRule] };
    const context = createPricingContext(
      1,
      new Date("2024-01-15T10:00:00"),
      new Date("2024-01-15T11:00:00"),
      "UTC"
    );

    const result = calculateVariablePrice(config, context);

    expect(result.totalPrice).toBe(5000); // Base price only
    expect(result.modifiers).toHaveLength(0);
  });
});

describe("createPricingContext", () => {
  it("should create correct pricing context", () => {
    const startTime = new Date("2024-01-15T10:30:00"); // Monday
    const endTime = new Date("2024-01-15T12:00:00"); // 90 minutes later
    
    const context = createPricingContext(1, startTime, endTime, "UTC");

    expect(context).toEqual({
      eventTypeId: 1,
      startTime,
      endTime,
      duration: 90, // minutes
      timezone: "UTC",
      dayOfWeek: 1, // Monday (0 = Sunday, 1 = Monday, ...)
    });
  });

  it("should calculate duration correctly for different time spans", () => {
    const startTime = new Date("2024-01-15T09:00:00");
    
    // 30 minutes
    const context30 = createPricingContext(
      1,
      startTime,
      new Date("2024-01-15T09:30:00"),
      "UTC"
    );
    expect(context30.duration).toBe(30);

    // 2 hours
    const context120 = createPricingContext(
      1,
      startTime,
      new Date("2024-01-15T11:00:00"),
      "UTC"
    );
    expect(context120.duration).toBe(120);
  });
});

describe("formatPrice", () => {
  it("should format USD prices correctly", () => {
    expect(formatPrice(5000, "usd")).toBe("$50.00");
    expect(formatPrice(12345, "usd")).toBe("$123.45");
    expect(formatPrice(0, "usd")).toBe("$0.00");
  });

  it("should format different currencies", () => {
    expect(formatPrice(5000, "eur")).toBe("€50.00");
    expect(formatPrice(5000, "gbp")).toBe("£50.00");
  });

  it("should handle different locales", () => {
    expect(formatPrice(5000, "usd", "en-US")).toBe("$50.00");
    // Note: Locale formatting may vary by system, so we test the pattern instead of exact match
    const euroFormatted = formatPrice(5000, "eur", "de-DE");
    expect(euroFormatted).toContain("50");
    expect(euroFormatted).toContain("€");
  });
});