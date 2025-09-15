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
} from "./types";

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Calculate the total price for a booking based on variable pricing rules
 */
export function calculateVariablePrice(
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
function calculateModifier(rule: PricingRule, currentPrice: number, context: PricingContext): PriceBreakdownItem {
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