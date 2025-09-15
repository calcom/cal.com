import { describe, expect, it } from "vitest";
import type { EventType } from "@prisma/client";

import {
  getVariablePricingConfig,
  setVariablePricingConfig,
  createPricingRule,
  createPriceModifier,
  validateVariablePricingConfig,
  isVariablePricingEnabled,
  getPricingRulesSummary,
  DEFAULT_VARIABLE_PRICING_CONFIG,
} from "../utils";
import type { VariablePricingConfig, PricingRule } from "../types";

// Mock EventType for testing
const createMockEventType = (overrides?: Partial<EventType>): EventType => ({
  id: 1,
  title: "Test Event",
  slug: "test-event",
  description: "Test description",
  position: 0,
  locations: null,
  length: 30,
  offsetStart: 0,
  hidden: false,
  userId: 1,
  teamId: null,
  eventName: null,
  parentId: null,
  bookingFields: null,
  timeZone: null,
  periodType: "UNLIMITED",
  periodStartDate: null,
  periodEndDate: null,
  periodDays: null,
  periodCountCalendarDays: false,
  lockTimeZoneToggleOnBookingPage: false,
  requiresConfirmation: false,
  requiresBookerEmailVerification: false,
  disableGuests: false,
  minimumBookingNotice: 120,
  beforeEventBuffer: 0,
  afterEventBuffer: 0,
  seatsPerTimeSlot: null,
  seatsShowAttendees: true,
  seatsShowAvailabilityCount: true,
  schedulingType: null,
  schedule: null,
  price: 0,
  currency: "usd",
  slotInterval: null,
  metadata: null,
  successRedirectUrl: null,
  forwardParamsSuccessRedirect: null,
  workflows: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("getVariablePricingConfig", () => {
  it("should return default config when no metadata exists", () => {
    const eventType = createMockEventType();
    const config = getVariablePricingConfig(eventType);

    expect(config).toEqual({
      ...DEFAULT_VARIABLE_PRICING_CONFIG,
      basePrice: 0,
      currency: "usd",
    });
  });

  it("should return config from metadata when it exists", () => {
    const variablePricing: VariablePricingConfig = {
      enabled: true,
      basePrice: 5000,
      currency: "eur",
      rules: [
        {
          id: "test-rule",
          type: "duration",
          enabled: true,
          priority: 5,
          description: "Test rule",
          condition: { minDuration: 30 },
        },
      ],
    };

    const eventType = createMockEventType({
      metadata: { variablePricing },
    });

    const config = getVariablePricingConfig(eventType);

    expect(config).toEqual(variablePricing);
  });

  it("should fall back to legacy price when metadata is invalid", () => {
    const eventType = createMockEventType({
      price: 2500,
      currency: "gbp",
      metadata: { variablePricing: "invalid" },
    });

    const config = getVariablePricingConfig(eventType);

    expect(config).toEqual({
      ...DEFAULT_VARIABLE_PRICING_CONFIG,
      basePrice: 2500,
      currency: "gbp",
    });
  });
});

describe("setVariablePricingConfig", () => {
  it("should update metadata with variable pricing config", () => {
    const eventType = createMockEventType({
      metadata: { existingField: "value" },
    });

    const pricingConfig: VariablePricingConfig = {
      enabled: true,
      basePrice: 7500,
      currency: "usd",
      rules: [],
    };

    const updatedMetadata = setVariablePricingConfig(eventType, pricingConfig);

    expect(updatedMetadata).toEqual({
      existingField: "value",
      variablePricing: pricingConfig,
    });
  });

  it("should create new metadata when none exists", () => {
    const eventType = createMockEventType();
    const pricingConfig: VariablePricingConfig = {
      enabled: false,
      basePrice: 1000,
      currency: "eur",
      rules: [],
    };

    const updatedMetadata = setVariablePricingConfig(eventType, pricingConfig);

    expect(updatedMetadata).toEqual({
      variablePricing: pricingConfig,
    });
  });
});

describe("createPricingRule", () => {
  it("should create duration rule with defaults", () => {
    const rule = createPricingRule("duration");

    expect(rule).toMatchObject({
      type: "duration",
      enabled: true,
      priority: 0,
      description: "duration rule",
      condition: {
        minDuration: 30,
        maxDuration: 120,
      },
    });
    expect(rule.id).toMatch(/^rule_\d+_[a-z0-9]+$/);
  });

  it("should create time of day rule with defaults", () => {
    const rule = createPricingRule("timeOfDay");

    expect(rule).toMatchObject({
      type: "timeOfDay",
      enabled: true,
      priority: 0,
      description: "timeOfDay rule",
      condition: {
        startTime: "09:00",
        endTime: "17:00",
      },
    });
  });

  it("should create day of week rule with defaults", () => {
    const rule = createPricingRule("dayOfWeek");

    expect(rule).toMatchObject({
      type: "dayOfWeek",
      enabled: true,
      priority: 0,
      description: "dayOfWeek rule",
      condition: {
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
    });
  });

  it("should accept overrides", () => {
    const rule = createPricingRule("duration", {
      description: "Custom duration rule",
      priority: 10,
      price: 5000,
    });

    expect(rule).toMatchObject({
      type: "duration",
      description: "Custom duration rule",
      priority: 10,
      price: 5000,
    });
  });
});

describe("createPriceModifier", () => {
  it("should create surcharge modifier", () => {
    const modifier = createPriceModifier("surcharge", 1500);

    expect(modifier).toEqual({
      type: "surcharge",
      value: 1500,
    });
  });

  it("should create modifier with percentage", () => {
    const modifier = createPriceModifier("discount", 0, 25);

    expect(modifier).toEqual({
      type: "discount",
      value: 0,
      percentage: 25,
    });
  });
});

describe("validateVariablePricingConfig", () => {
  it("should validate valid config", () => {
    const config: VariablePricingConfig = {
      enabled: true,
      basePrice: 5000,
      currency: "usd",
      rules: [
        {
          id: "valid-rule",
          type: "duration",
          enabled: true,
          priority: 5,
          description: "Valid rule",
          condition: { minDuration: 30, maxDuration: 120 },
          priceModifier: {
            type: "surcharge",
            value: 1000,
          },
        },
      ],
    };

    const result = validateVariablePricingConfig(config);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect invalid base price", () => {
    const config: VariablePricingConfig = {
      enabled: true,
      basePrice: -100,
      currency: "usd",
      rules: [],
    };

    const result = validateVariablePricingConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Base price must be non-negative");
  });

  it("should detect invalid currency", () => {
    const config: VariablePricingConfig = {
      enabled: true,
      basePrice: 5000,
      currency: "invalid",
      rules: [],
    };

    const result = validateVariablePricingConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Currency must be a valid 3-letter ISO code");
  });

  it("should validate pricing rules", () => {
    const config: VariablePricingConfig = {
      enabled: true,
      basePrice: 5000,
      currency: "usd",
      rules: [
        {
          id: "",
          type: "duration",
          enabled: true,
          priority: -5,
          description: "Invalid rule",
          condition: { minDuration: 120, maxDuration: 60 },
          price: -100,
        },
      ],
    };

    const result = validateVariablePricingConfig(config);

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Rule ID is required");
    expect(result.errors[0]).toContain("Priority must be between 0 and 100");
    expect(result.errors[0]).toContain("Price must be non-negative");
    expect(result.errors[0]).toContain("Minimum duration cannot be greater than maximum duration");
  });
});

describe("isVariablePricingEnabled", () => {
  it("should return true when enabled with rules", () => {
    const eventType = createMockEventType({
      metadata: {
        variablePricing: {
          enabled: true,
          basePrice: 5000,
          currency: "usd",
          rules: [createPricingRule("duration")],
        },
      },
    });

    expect(isVariablePricingEnabled(eventType)).toBe(true);
  });

  it("should return false when disabled", () => {
    const eventType = createMockEventType({
      metadata: {
        variablePricing: {
          enabled: false,
          basePrice: 5000,
          currency: "usd",
          rules: [createPricingRule("duration")],
        },
      },
    });

    expect(isVariablePricingEnabled(eventType)).toBe(false);
  });

  it("should return false when no rules exist", () => {
    const eventType = createMockEventType({
      metadata: {
        variablePricing: {
          enabled: true,
          basePrice: 5000,
          currency: "usd",
          rules: [],
        },
      },
    });

    expect(isVariablePricingEnabled(eventType)).toBe(false);
  });
});

describe("getPricingRulesSummary", () => {
  it("should return disabled message when disabled", () => {
    const config: VariablePricingConfig = {
      enabled: false,
      basePrice: 5000,
      currency: "usd",
      rules: [],
    };

    const summary = getPricingRulesSummary(config);

    expect(summary).toBe("Variable pricing disabled");
  });

  it("should return no rules message when no enabled rules", () => {
    const config: VariablePricingConfig = {
      enabled: true,
      basePrice: 5000,
      currency: "usd",
      rules: [
        {
          ...createPricingRule("duration"),
          enabled: false,
        },
      ],
    };

    const summary = getPricingRulesSummary(config);

    expect(summary).toBe("No active pricing rules");
  });

  it("should return summary of active rules", () => {
    const config: VariablePricingConfig = {
      enabled: true,
      basePrice: 5000,
      currency: "usd",
      rules: [
        createPricingRule("duration"),
        createPricingRule("timeOfDay"),
        {
          ...createPricingRule("dayOfWeek"),
          enabled: false,
        },
      ],
    };

    const summary = getPricingRulesSummary(config);

    expect(summary).toBe("2 active rules (duration, timeOfDay)");
  });
});