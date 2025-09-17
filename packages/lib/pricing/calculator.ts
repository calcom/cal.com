import { format } from "date-fns";

import type {
  PricingContext,
  PricingRule,
  VariablePricingConfig,
  PriceCalculationResult,
  PriceBreakdownItem,
  DurationCondition,
  TimeOfDayCondition,
  DayOfWeekCondition,
  EnhancedPricingContext,
  BulkPricingRequest,
  BulkPricingResult,
} from "./types";

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Simple in-memory cache for pricing calculations
const calculationCache = new Map<string, CacheEntry>();

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

interface CacheEntry {
  result: PriceCalculationResult;
  timestamp: number;
}

/**
 * Generate cache key for pricing calculation
 */
function generateCacheKey(config: VariablePricingConfig, context: PricingContext): string {
  const configHash = JSON.stringify({
    enabled: config.enabled,
    basePrice: config.basePrice,
    currency: config.currency,
    rules: config.rules
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        type: r.type,
        priority: r.priority,
        condition: r.condition,
        price: r.price,
        priceModifier: r.priceModifier,
      })),
  });

  const contextHash = JSON.stringify({
    eventTypeId: context.eventTypeId,
    duration: context.duration,
    startTime: context.startTime.toISOString(),
    endTime: context.endTime.toISOString(),
    timezone: context.timezone,
  });

  return `${configHash}|${contextHash}`;
}

/**
 * Get calculation from cache if valid
 */
function getFromCache(cacheKey: string): PriceCalculationResult | null {
  const entry = calculationCache.get(cacheKey);

  if (!entry) return null;

  // Check if cache entry is expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    calculationCache.delete(cacheKey);
    return null;
  }

  return entry.result;
}

/**
 * Store calculation result in cache
 */
function storeInCache(cacheKey: string, result: PriceCalculationResult): void {
  // Prevent cache from growing too large
  if (calculationCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (simple LRU-like behavior)
    const oldestKeys = Array.from(calculationCache.keys()).slice(0, MAX_CACHE_SIZE / 4);
    oldestKeys.forEach((key) => calculationCache.delete(key));
  }

  calculationCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });
}

/**
 * Clear the pricing calculation cache
 */
export function clearPricingCache(): void {
  calculationCache.clear();
}

/**
 * Calculate the total price for a booking based on variable pricing rules
 * Now includes caching for improved performance
 */
export function calculateVariablePrice(
  config: VariablePricingConfig,
  context: PricingContext
): PriceCalculationResult {
  // Check cache first
  const cacheKey = generateCacheKey(config, context);
  const cachedResult = getFromCache(cacheKey);

  if (cachedResult) {
    return cachedResult;
  }

  // Perform calculation
  const result = calculateVariablePriceInternal(config, context);

  // Store in cache
  storeInCache(cacheKey, result);

  return result;
}

/**
 * Internal calculation method (without caching)
 */
function calculateVariablePriceInternal(
  config: VariablePricingConfig,
  context: PricingContext
): PriceCalculationResult {
  if (!config.enabled || !config.rules || config.rules.length === 0) {
    // Fall back to base price if variable pricing is disabled or no rules
    return {
      basePrice: config.basePrice,
      modifiers: [],
      totalPrice: config.basePrice,
      breakdown: [
        {
          description: "Base price",
          amount: config.basePrice,
          type: "base",
        },
      ],
      currency: config.currency,
    };
  }

  // Start with base price
  let totalPrice = config.basePrice;
  const modifiers: PriceBreakdownItem[] = [];
  const breakdown: PriceBreakdownItem[] = [
    {
      description: "Base price",
      amount: config.basePrice,
      type: "base",
    },
  ];

  // Sort rules by priority (higher priority first), then by type
  const enabledRules = config.rules
    .filter((rule) => rule.enabled)
    .sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort by type order: duration > timeOfDay > dayOfWeek > custom
      const typeOrder = { duration: 0, timeOfDay: 1, dayOfWeek: 2, custom: 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

  // Check for duration-based absolute pricing first
  const durationRule = findApplicableDurationRule(enabledRules, context);
  if (durationRule && durationRule.price !== undefined) {
    totalPrice = durationRule.price;
    breakdown[0] = {
      description: durationRule.description || "Duration-based pricing",
      amount: durationRule.price,
      type: "base",
      ruleId: durationRule.id,
    };
  }

  // Apply modifiers (surcharges/discounts)
  for (const rule of enabledRules) {
    if (!rule.priceModifier) continue;

    const isApplicable = isRuleApplicable(rule, context);
    if (!isApplicable) continue;

    const modifier = calculateModifier(rule, totalPrice, context);
    if (modifier.amount === 0) continue;

    modifiers.push(modifier);
    breakdown.push(modifier);
    totalPrice += modifier.amount;
  }

  // Ensure price is not negative
  totalPrice = Math.max(0, totalPrice);

  return {
    basePrice: config.basePrice,
    modifiers,
    totalPrice,
    breakdown,
    currency: config.currency,
  };
}

/**
 * Check if a pricing rule applies to the given context
 */
function isRuleApplicable(rule: PricingRule, context: PricingContext): boolean {
  switch (rule.type) {
    case "duration":
      return isDurationRuleApplicable(rule.condition as DurationCondition, context);
    case "timeOfDay":
      return isTimeOfDayRuleApplicable(rule.condition as TimeOfDayCondition, context);
    case "dayOfWeek":
      return isDayOfWeekRuleApplicable(rule.condition as DayOfWeekCondition, context);
    case "custom":
      // For now, custom rules are not implemented
      return false;
    default:
      return false;
  }
}

/**
 * Find the applicable duration rule (for absolute pricing)
 */
function findApplicableDurationRule(rules: PricingRule[], context: PricingContext): PricingRule | null {
  for (const rule of rules) {
    if (rule.type === "duration" && rule.price !== undefined) {
      if (isDurationRuleApplicable(rule.condition as DurationCondition, context)) {
        return rule;
      }
    }
  }
  return null;
}

/**
 * Check if duration rule applies
 */
function isDurationRuleApplicable(condition: DurationCondition, context: PricingContext): boolean {
  const { minDuration, maxDuration } = condition;
  const { duration } = context;

  if (minDuration !== undefined && duration < minDuration) return false;
  if (maxDuration !== undefined && duration > maxDuration) return false;

  return true;
}

/**
 * Check if time of day rule applies
 */
function isTimeOfDayRuleApplicable(condition: TimeOfDayCondition, context: PricingContext): boolean {
  const { startTime, endTime } = condition;
  const contextTime = format(context.startTime, "HH:mm");

  // Handle same-day time range (e.g., 09:00 to 17:00)
  if (startTime <= endTime) {
    return contextTime >= startTime && contextTime <= endTime;
  }

  // Handle overnight time range (e.g., 22:00 to 06:00)
  return contextTime >= startTime || contextTime <= endTime;
}

/**
 * Check if day of week rule applies
 */
function isDayOfWeekRuleApplicable(condition: DayOfWeekCondition, context: PricingContext): boolean {
  const dayName = DAYS_OF_WEEK[context.dayOfWeek];
  return condition.days.some((day) => day.toLowerCase() === dayName);
}

/**
 * Calculate the price modifier for a rule
 */
function calculateModifier(
  rule: PricingRule,
  currentPrice: number,
  _context: PricingContext
): PriceBreakdownItem {
  const { priceModifier } = rule;
  if (!priceModifier) {
    return {
      description: rule.description,
      amount: 0,
      type: "surcharge",
      ruleId: rule.id,
    };
  }

  let amount = 0;
  let type: "surcharge" | "discount" = "surcharge";

  switch (priceModifier.type) {
    case "absolute":
      amount = priceModifier.value - currentPrice;
      type = amount >= 0 ? "surcharge" : "discount";
      break;
    case "surcharge":
      amount = priceModifier.value;
      type = "surcharge";
      break;
    case "discount":
      amount = -Math.abs(priceModifier.value);
      type = "discount";
      break;
  }

  // Handle percentage-based modifiers
  if (priceModifier.percentage !== undefined) {
    const percentageAmount = Math.round((currentPrice * priceModifier.percentage) / 100);
    if (priceModifier.type === "discount") {
      amount = -percentageAmount;
      type = "discount";
    } else {
      amount = percentageAmount;
      type = "surcharge";
    }
  }

  return {
    description: rule.description,
    amount,
    type,
    ruleId: rule.id,
  };
}

/**
 * Helper function to format price for display
 */
export function formatPrice(amount: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Helper function to get pricing context from booking parameters
 */
export function createPricingContext(
  eventTypeId: number,
  startTime: Date,
  endTime: Date,
  timezone: string
): PricingContext {
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  return {
    eventTypeId,
    startTime,
    endTime,
    duration,
    timezone,
    dayOfWeek: startTime.getDay(),
  };
}

/**
 * Calculate pricing for multiple scenarios at once (bulk operation)
 * Useful for displaying pricing tables or analytics
 */
export function calculateBulkPricing(
  config: VariablePricingConfig,
  request: BulkPricingRequest
): BulkPricingResult {
  const results: Record<string, PriceCalculationResult> = {};
  const prices: number[] = [];

  for (const scenario of request.scenarios) {
    const context = createPricingContext(
      request.eventTypeId,
      scenario.startTime,
      scenario.endTime,
      scenario.timezone
    );

    const result = calculateVariablePrice(config, context);
    results[scenario.id] = result;
    prices.push(result.totalPrice);
  }

  return {
    results,
    statistics: {
      averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      totalScenarios: prices.length,
    },
  };
}

/**
 * Calculate pricing for a time range with different durations
 * Useful for showing pricing options to users
 */
export function calculatePricingOptions(
  config: VariablePricingConfig,
  eventTypeId: number,
  startTime: Date,
  durations: number[], // Array of durations in minutes
  timezone: string
): Array<{
  duration: number;
  endTime: Date;
  pricing: PriceCalculationResult;
}> {
  return durations.map((duration) => {
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const context = createPricingContext(eventTypeId, startTime, endTime, timezone);
    const pricing = calculateVariablePrice(config, context);

    return {
      duration,
      endTime,
      pricing,
    };
  });
}

/**
 * Get pricing preview for different time slots in a day
 * Useful for showing users how prices vary throughout the day
 */
export function getPricingPreviewForDay(
  config: VariablePricingConfig,
  eventTypeId: number,
  date: Date,
  duration: number,
  timezone: string,
  options: {
    intervalMinutes?: number;
    startHour?: number;
    endHour?: number;
  } = {}
): Array<{
  startTime: Date;
  endTime: Date;
  pricing: PriceCalculationResult;
}> {
  const { intervalMinutes = 60, startHour = 8, endHour = 20 } = options;
  const previews: Array<{
    startTime: Date;
    endTime: Date;
    pricing: PriceCalculationResult;
  }> = [];

  for (let hour = startHour; hour <= endHour; hour += intervalMinutes / 60) {
    const startTime = new Date(date);
    startTime.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const context = createPricingContext(eventTypeId, startTime, endTime, timezone);
    const pricing = calculateVariablePrice(config, context);

    previews.push({
      startTime,
      endTime,
      pricing,
    });
  }

  return previews;
}

/**
 * Advanced price calculation with enhanced context
 * Supports additional business rules and user-specific pricing
 */
export function calculateEnhancedPrice(
  config: VariablePricingConfig,
  context: EnhancedPricingContext
): PriceCalculationResult {
  // Start with base calculation
  const baseResult = calculateVariablePrice(config, context);

  // Apply enhanced rules based on additional context
  let totalPrice = baseResult.totalPrice;
  const enhancedModifiers: PriceBreakdownItem[] = [...baseResult.modifiers];
  const enhancedBreakdown: PriceBreakdownItem[] = [...baseResult.breakdown];

  // Membership tier discounts
  if (context.membershipTier) {
    const tierDiscounts: Partial<Record<typeof context.membershipTier, number>> = {
      premium: 10, // 10% discount
      enterprise: 20, // 20% discount
    };

    const discountPercentage = tierDiscounts[context.membershipTier];
    if (discountPercentage) {
      const discountAmount = Math.round((totalPrice * discountPercentage) / 100);
      const tierModifier: PriceBreakdownItem = {
        description: `${context.membershipTier} member discount (${discountPercentage}%)`,
        amount: -discountAmount,
        type: "discount",
        ruleId: `tier-${context.membershipTier}`,
      };

      enhancedModifiers.push(tierModifier);
      enhancedBreakdown.push(tierModifier);
      totalPrice -= discountAmount;
    }
  }

  // Repeat booking discount
  if (context.isRepeatBooking) {
    const repeatDiscount = Math.round(totalPrice * 0.05); // 5% repeat booking discount
    const repeatModifier: PriceBreakdownItem = {
      description: "Repeat booking discount (5%)",
      amount: -repeatDiscount,
      type: "discount",
      ruleId: "repeat-booking",
    };

    enhancedModifiers.push(repeatModifier);
    enhancedBreakdown.push(repeatModifier);
    totalPrice -= repeatDiscount;
  }

  // Ensure price is not negative
  totalPrice = Math.max(0, totalPrice);

  return {
    ...baseResult,
    modifiers: enhancedModifiers,
    breakdown: enhancedBreakdown,
    totalPrice,
  };
}
