import type { EventType, Prisma } from "@prisma/client";

import type {
  VariablePricingConfig,
  PricingRule,
  PriceModifier,
  DurationCondition,
  TimeOfDayCondition,
  DayOfWeekCondition,
} from "./types";

/**
 * Default variable pricing configuration
 */
export const DEFAULT_VARIABLE_PRICING_CONFIG: VariablePricingConfig = {
  enabled: false,
  basePrice: 0,
  currency: "usd",
  rules: [],
};

/**
 * Extract variable pricing configuration from event type metadata
 */
export function getVariablePricingConfig(eventType: EventType): VariablePricingConfig {
  try {
    const metadata = eventType.metadata as Prisma.JsonObject;
    const pricingConfig = metadata?.variablePricing as VariablePricingConfig;

    // Check if pricingConfig is a valid object with required properties
    if (!pricingConfig || typeof pricingConfig !== 'object' || pricingConfig === null) {
      // Check for legacy price field as fallback
      const legacyPrice = eventType.price || 0;
      return {
        ...DEFAULT_VARIABLE_PRICING_CONFIG,
        basePrice: legacyPrice,
        currency: eventType.currency || "usd",
      };
    }

    // Validate and return the pricing config
    return {
      enabled: Boolean(pricingConfig.enabled),
      basePrice: Number(pricingConfig.basePrice) || 0,
      currency: pricingConfig.currency || "usd",
      rules: Array.isArray(pricingConfig.rules) ? pricingConfig.rules : [],
    };
  } catch (error) {
    console.error("Error parsing variable pricing config:", error);
    // Return default config with legacy price as fallback
    const legacyPrice = eventType.price || 0;
    return {
      ...DEFAULT_VARIABLE_PRICING_CONFIG,
      basePrice: legacyPrice,
      currency: eventType.currency || "usd",
    };
  }
}

/**
 * Update variable pricing configuration in event type metadata
 */
export function setVariablePricingConfig(
  eventType: EventType,
  config: VariablePricingConfig
): Prisma.JsonObject {
  const metadata = (eventType.metadata as Prisma.JsonObject) || {};

  return {
    ...metadata,
    variablePricing: {
      enabled: config.enabled,
      basePrice: config.basePrice,
      currency: config.currency,
      rules: config.rules,
    },
  };
}

/**
 * Create a new pricing rule with default values
 */
export function createPricingRule(
  type: PricingRule["type"],
  overrides?: Partial<PricingRule>
): PricingRule {
  const baseRule: PricingRule = {
    id: generateRuleId(),
    type,
    enabled: true,
    priority: 0,
    description: `${type} rule`,
    condition: createDefaultCondition(type),
    ...overrides,
  };

  return baseRule;
}

/**
 * Create default condition based on rule type
 */
function createDefaultCondition(type: PricingRule["type"]): PricingRule["condition"] {
  switch (type) {
    case "duration":
      return {
        minDuration: 30,
        maxDuration: 120,
      } as DurationCondition;

    case "timeOfDay":
      return {
        startTime: "09:00",
        endTime: "17:00",
      } as TimeOfDayCondition;

    case "dayOfWeek":
      return {
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      } as DayOfWeekCondition;

    case "custom":
      return {} as Record<string, unknown>;

    default:
      return {};
  }
}

/**
 * Generate a unique ID for pricing rules
 */
function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a price modifier
 */
export function createPriceModifier(
  type: PriceModifier["type"],
  value: number,
  percentage?: number
): PriceModifier {
  return {
    type,
    value,
    percentage,
  };
}

/**
 * Validate a variable pricing configuration
 */
export function validateVariablePricingConfig(config: VariablePricingConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate base price
  if (config.basePrice < 0) {
    errors.push("Base price must be non-negative");
  }

  // Validate currency
  if (!config.currency || config.currency.length !== 3) {
    errors.push("Currency must be a valid 3-letter ISO code");
  }

  // Validate rules
  if (config.rules) {
    for (let i = 0; i < config.rules.length; i++) {
      const rule = config.rules[i];
      const ruleErrors = validatePricingRule(rule);
      
      if (ruleErrors.length > 0) {
        errors.push(`Rule ${i + 1}: ${ruleErrors.join(", ")}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single pricing rule
 */
function validatePricingRule(rule: PricingRule): string[] {
  const errors: string[] = [];

  // Validate rule ID
  if (!rule.id) {
    errors.push("Rule ID is required");
  }

  // Validate rule type
  if (!["duration", "timeOfDay", "dayOfWeek", "custom"].includes(rule.type)) {
    errors.push("Invalid rule type");
  }

  // Validate priority
  if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 100)) {
    errors.push("Priority must be between 0 and 100");
  }

  // Validate price (if set)
  if (rule.price !== undefined && rule.price < 0) {
    errors.push("Price must be non-negative");
  }

  // Validate price modifier
  if (rule.priceModifier) {
    const modifierErrors = validatePriceModifier(rule.priceModifier);
    errors.push(...modifierErrors);
  }

  // Validate condition based on type
  const conditionErrors = validateRuleCondition(rule.type, rule.condition);
  errors.push(...conditionErrors);

  return errors;
}

/**
 * Validate a price modifier
 */
function validatePriceModifier(modifier: PriceModifier): string[] {
  const errors: string[] = [];

  if (!["absolute", "surcharge", "discount"].includes(modifier.type)) {
    errors.push("Invalid modifier type");
  }

  if (modifier.value < 0) {
    errors.push("Modifier value must be non-negative");
  }

  if (modifier.percentage !== undefined) {
    if (modifier.percentage < 0 || modifier.percentage > 100) {
      errors.push("Modifier percentage must be between 0 and 100");
    }
  }

  return errors;
}

/**
 * Validate rule condition based on type
 */
function validateRuleCondition(type: PricingRule["type"], condition: PricingRule["condition"]): string[] {
  const errors: string[] = [];

  switch (type) {
    case "duration": {
      const durationCondition = condition as DurationCondition;
      
      if (durationCondition.minDuration !== undefined && durationCondition.minDuration < 0) {
        errors.push("Minimum duration must be non-negative");
      }
      
      if (durationCondition.maxDuration !== undefined && durationCondition.maxDuration < 0) {
        errors.push("Maximum duration must be non-negative");
      }
      
      if (
        durationCondition.minDuration !== undefined &&
        durationCondition.maxDuration !== undefined &&
        durationCondition.minDuration > durationCondition.maxDuration
      ) {
        errors.push("Minimum duration cannot be greater than maximum duration");
      }
      break;
    }

    case "timeOfDay": {
      const timeCondition = condition as TimeOfDayCondition;
      
      if (!isValidTimeFormat(timeCondition.startTime)) {
        errors.push("Invalid start time format (use HH:mm)");
      }
      
      if (!isValidTimeFormat(timeCondition.endTime)) {
        errors.push("Invalid end time format (use HH:mm)");
      }
      break;
    }

    case "dayOfWeek": {
      const dayCondition = condition as DayOfWeekCondition;
      
      if (!Array.isArray(dayCondition.days) || dayCondition.days.length === 0) {
        errors.push("At least one day must be selected");
      }
      
      const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const invalidDays = dayCondition.days.filter((day) => !validDays.includes(day.toLowerCase()));
      
      if (invalidDays.length > 0) {
        errors.push(`Invalid days: ${invalidDays.join(", ")}`);
      }
      break;
    }

    case "custom":
      // Custom validation would be implemented based on specific requirements
      break;
  }

  return errors;
}

/**
 * Validate time format (HH:mm)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Check if variable pricing is enabled for an event type
 */
export function isVariablePricingEnabled(eventType: EventType): boolean {
  const config = getVariablePricingConfig(eventType);
  return config.enabled && config.rules.length > 0;
}

/**
 * Get a summary of pricing rules for display
 */
export function getPricingRulesSummary(config: VariablePricingConfig): string {
  if (!config.enabled || !config.rules || config.rules.length === 0) {
    return "Variable pricing disabled";
  }

  const enabledRules = config.rules.filter((rule) => rule.enabled);
  
  if (enabledRules.length === 0) {
    return "No active pricing rules";
  }

  const ruleTypes = enabledRules.map((rule) => rule.type);
  const uniqueTypes = [...new Set(ruleTypes)];
  
  return `${enabledRules.length} active rules (${uniqueTypes.join(", ")})`;
}