import type { EventType } from "@calcom/prisma/client";

import type {
  VariablePricingConfig,
  PricingRule,
  PriceModifier,
  PriceCalculationResult,
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

// Define a minimal event type structure that's needed for pricing config
export type MinimalEventType = {
  id: number;
  metadata: unknown;
  price?: number;
  currency?: string;
};

/**
 * Extract variable pricing configuration from event type metadata
 */
export function getVariablePricingConfig(eventType: MinimalEventType): VariablePricingConfig {
  try {
    const metadata = eventType.metadata as Record<string, unknown>;
    const pricingConfig = metadata?.variablePricing as Record<string, unknown>;

    // Check if pricingConfig is a valid object with required properties
    if (!pricingConfig || typeof pricingConfig !== "object" || pricingConfig === null) {
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
      currency: (pricingConfig.currency as string) || "usd",
      rules: Array.isArray(pricingConfig.rules) ? (pricingConfig.rules as PricingRule[]) : [],
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
  eventType: MinimalEventType,
  config: VariablePricingConfig
): Record<string, unknown> {
  const metadata = (eventType.metadata as Record<string, unknown>) || {};

  return {
    ...metadata,
    variablePricing: {
      enabled: config.enabled,
      basePrice: config.basePrice,
      currency: config.currency,
      rules: config.rules as unknown[], // Cast to avoid Prisma JsonValue issues
    },
  };
}

/**
 * Create a new pricing rule with default values
 */
export function createPricingRule(type: PricingRule["type"], overrides?: Partial<PricingRule>): PricingRule {
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
  const uniqueTypes = Array.from(new Set(ruleTypes));

  return `${enabledRules.length} active rules (${uniqueTypes.join(", ")})`;
}

// ============================================================================
// ENHANCED UTILITY FUNCTIONS FOR ADVANCED FEATURES
// ============================================================================

/**
 * Convert price between currencies (requires exchange rate service)
 */
export function convertPrice(amount: number, fromCurrency: string, toCurrency: string): number {
  // This is a placeholder - in production, you'd integrate with an exchange rate service
  // For now, return the same amount
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Placeholder conversion rates (would come from live service)
  const conversionRates: Record<string, Record<string, number>> = {
    USD: { EUR: 0.85, GBP: 0.75, CAD: 1.25, AUD: 1.35 },
    EUR: { USD: 1.18, GBP: 0.88, CAD: 1.47, AUD: 1.59 },
    GBP: { USD: 1.33, EUR: 1.14, CAD: 1.67, AUD: 1.8 },
  };

  const rate = conversionRates[fromCurrency]?.[toCurrency];
  return rate ? Math.round(amount * rate) : amount;
}

/**
 * Format price with proper currency symbols and localization
 */
export function formatPriceWithLocale(
  amount: number,
  currency: string,
  locale = "en-US",
  options?: {
    showCents?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { showCents = true, minimumFractionDigits, maximumFractionDigits } = options || {};

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: showCents ? minimumFractionDigits ?? 2 : 0,
    maximumFractionDigits: showCents ? maximumFractionDigits ?? 2 : 0,
  }).format(amount / 100);
}

/**
 * Get supported currencies for the pricing system
 */
export function getSupportedCurrencies(): Array<{ code: string; name: string; symbol: string }> {
  return [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  ];
}

/**
 * Validate currency code against supported currencies
 */
export function isValidCurrency(currency: string): boolean {
  const supportedCurrencies = getSupportedCurrencies().map((c) => c.code);
  return supportedCurrencies.includes(currency.toUpperCase());
}

/**
 * Create a complete pricing rule with validation
 */
export function createValidatedPricingRule(
  type: PricingRule["type"],
  config: Partial<PricingRule>
): { rule: PricingRule | null; errors: string[] } {
  const rule = createPricingRule(type, config);
  const errors = validatePricingRule(rule);

  return {
    rule: errors.length === 0 ? rule : null,
    errors,
  };
}

/**
 * Clone a pricing configuration for editing
 */
export function cloneVariablePricingConfig(config: VariablePricingConfig): VariablePricingConfig {
  return {
    enabled: config.enabled,
    basePrice: config.basePrice,
    currency: config.currency,
    rules: config.rules.map((rule) => ({
      ...rule,
      condition: { ...rule.condition },
      priceModifier: rule.priceModifier ? { ...rule.priceModifier } : undefined,
    })),
  };
}

/**
 * Merge multiple pricing configurations (useful for inheritance)
 */
export function mergePricingConfigs(
  baseConfig: VariablePricingConfig,
  overrideConfig: Partial<VariablePricingConfig>
): VariablePricingConfig {
  return {
    ...baseConfig,
    ...overrideConfig,
    rules: [...(baseConfig.rules || []), ...(overrideConfig.rules || [])].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    ),
  };
}

/**
 * Get pricing rule conflicts (rules that might overlap)
 */
export function findPricingRuleConflicts(rules: PricingRule[]): Array<{
  rule1: PricingRule;
  rule2: PricingRule;
  conflictType: string;
}> {
  const conflicts: Array<{
    rule1: PricingRule;
    rule2: PricingRule;
    conflictType: string;
  }> = [];

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const rule1 = rules[i];
      const rule2 = rules[j];

      // Check if same type rules might conflict
      if (rule1.type === rule2.type && rule1.enabled && rule2.enabled) {
        // Different conflict types based on rule type
        let conflictType = "";

        if (rule1.type === "duration") {
          const cond1 = rule1.condition as DurationCondition;
          const cond2 = rule2.condition as DurationCondition;

          if (conditionsOverlap(cond1, cond2)) {
            conflictType = "overlapping duration ranges";
          }
        } else if (rule1.type === "timeOfDay") {
          const cond1 = rule1.condition as TimeOfDayCondition;
          const cond2 = rule2.condition as TimeOfDayCondition;

          if (timeRangesOverlap(cond1, cond2)) {
            conflictType = "overlapping time ranges";
          }
        } else if (rule1.type === "dayOfWeek") {
          const cond1 = rule1.condition as DayOfWeekCondition;
          const cond2 = rule2.condition as DayOfWeekCondition;

          if (daysOverlap(cond1.days, cond2.days)) {
            conflictType = "overlapping days";
          }
        }

        if (conflictType) {
          conflicts.push({ rule1, rule2, conflictType });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Check if two duration conditions overlap
 */
function conditionsOverlap(cond1: DurationCondition, cond2: DurationCondition): boolean {
  const min1 = cond1.minDuration || 0;
  const max1 = cond1.maxDuration || Infinity;
  const min2 = cond2.minDuration || 0;
  const max2 = cond2.maxDuration || Infinity;

  return !(max1 < min2 || max2 < min1);
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(cond1: TimeOfDayCondition, cond2: TimeOfDayCondition): boolean {
  const time1Start = timeToMinutes(cond1.startTime);
  const time1End = timeToMinutes(cond1.endTime);
  const time2Start = timeToMinutes(cond2.startTime);
  const time2End = timeToMinutes(cond2.endTime);

  // Handle overnight ranges
  if (time1End < time1Start || time2End < time2Start) {
    // Complex overnight logic - simplified for now
    return true; // Assume overlap for overnight ranges
  }

  return !(time1End < time2Start || time2End < time1Start);
}

/**
 * Convert HH:mm time to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two day arrays have overlapping days
 */
function daysOverlap(days1: string[], days2: string[]): boolean {
  return days1.some((day) => days2.includes(day));
}

/**
 * Optimize pricing rules by removing redundant rules and reordering
 */
export function optimizePricingRules(rules: PricingRule[]): {
  optimizedRules: PricingRule[];
  removedRules: PricingRule[];
  optimizations: string[];
} {
  const optimizations: string[] = [];
  let optimizedRules = [...rules];
  const removedRules: PricingRule[] = [];

  // Remove disabled rules
  const disabledRules = optimizedRules.filter((rule) => !rule.enabled);
  optimizedRules = optimizedRules.filter((rule) => rule.enabled);
  removedRules.push(...disabledRules);

  if (disabledRules.length > 0) {
    optimizations.push(`Removed ${disabledRules.length} disabled rules`);
  }

  // Sort by priority (highest first)
  optimizedRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  optimizations.push("Sorted rules by priority");

  // Remove duplicate rules (same type, same condition)
  const uniqueRules: PricingRule[] = [];
  const duplicateRules: PricingRule[] = [];

  for (const rule of optimizedRules) {
    const isDuplicate = uniqueRules.some(
      (existing) =>
        existing.type === rule.type && JSON.stringify(existing.condition) === JSON.stringify(rule.condition)
    );

    if (isDuplicate) {
      duplicateRules.push(rule);
    } else {
      uniqueRules.push(rule);
    }
  }

  if (duplicateRules.length > 0) {
    optimizations.push(`Removed ${duplicateRules.length} duplicate rules`);
    removedRules.push(...duplicateRules);
  }

  return {
    optimizedRules: uniqueRules,
    removedRules,
    optimizations,
  };
}

/**
 * Calculate pricing statistics from historical data
 */
export function calculatePricingStatistics(calculations: PriceCalculationResult[]): {
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  totalRevenue: number;
  discountFrequency: number;
  surchargeFrequency: number;
} {
  if (calculations.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      totalRevenue: 0,
      discountFrequency: 0,
      surchargeFrequency: 0,
    };
  }

  const prices = calculations.map((calc) => calc.totalPrice);
  const totalRevenue = prices.reduce((sum, price) => sum + price, 0);
  const averagePrice = totalRevenue / prices.length;

  prices.sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];

  const discountCount = calculations.filter((calc) =>
    calc.modifiers.some((mod) => mod.type === "discount")
  ).length;

  const surchargeCount = calculations.filter((calc) =>
    calc.modifiers.some((mod) => mod.type === "surcharge")
  ).length;

  return {
    averagePrice,
    medianPrice,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    totalRevenue,
    discountFrequency: discountCount / calculations.length,
    surchargeFrequency: surchargeCount / calculations.length,
  };
}
