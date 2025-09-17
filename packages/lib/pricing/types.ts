/**
 * Variable Pricing System Type Definitions
 *
 * This module defines comprehensive TypeScript types for Cal.com's variable pricing system.
 * It supports dynamic pricing based on duration, time-of-day, day-of-week, and custom rules
 * with percentage and fixed-amount modifiers.
 *
 * @example Basic usage
 * ```typescript
 * const config: VariablePricingConfig = {
 *   enabled: true,
 *   basePrice: 10000, // $100.00 in cents
 *   currency: "USD",
 *   rules: [
 *     {
 *       id: "weekend-surcharge",
 *       type: "dayOfWeek",
 *       description: "Weekend premium",
 *       enabled: true,
 *       priority: 5,
 *       condition: { days: ["saturday", "sunday"] },
 *       priceModifier: { type: "surcharge", value: 0, percentage: 25 }
 *     }
 *   ]
 * };
 * ```
 */

/**
 * Supported currency codes (ISO 4217)
 */
export type SupportedCurrency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "INR" | "BRL" | "MXN";

/**
 * Timezone identifiers (IANA Time Zone Database)
 */
export type TimezoneId = string;

/**
 * Types of pricing rules that can be applied
 *
 * - `duration`: Rules based on booking duration (e.g., longer sessions cost more)
 * - `timeOfDay`: Rules based on time of day (e.g., after-hours surcharge)
 * - `dayOfWeek`: Rules based on day of week (e.g., weekend premium)
 * - `custom`: Custom rules with business logic (extensible for future features)
 */
export type PricingRuleType = "duration" | "timeOfDay" | "dayOfWeek" | "custom";

/**
 * Types of price modifications that can be applied
 *
 * - `surcharge`: Add additional cost (can be fixed amount or percentage)
 * - `discount`: Reduce cost (can be fixed amount or percentage)
 * - `absolute`: Set absolute price, overriding base price calculation
 */
export type PriceModifierType = "surcharge" | "discount" | "absolute";

/**
 * Days of the week (lowercase for consistency)
 */
export type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

/**
 * A pricing rule defines conditions under which pricing modifications are applied
 *
 * @example Duration-based absolute pricing
 * ```typescript
 * const longSessionRule: PricingRule = {
 *   id: "long-session",
 *   type: "duration",
 *   description: "Extended consultation rate",
 *   enabled: true,
 *   priority: 10,
 *   condition: { minDuration: 120 }, // 2+ hours
 *   price: 25000 // $250 flat rate
 * };
 * ```
 *
 * @example Time-based percentage surcharge
 * ```typescript
 * const afterHoursRule: PricingRule = {
 *   id: "after-hours",
 *   type: "timeOfDay",
 *   description: "After hours premium",
 *   enabled: true,
 *   priority: 5,
 *   condition: { startTime: "18:00", endTime: "08:00" },
 *   priceModifier: { type: "surcharge", value: 0, percentage: 50 }
 * };
 * ```
 */
export interface PricingRule {
  /** Unique identifier for the rule */
  id: string;
  /** The type of rule determining what conditions apply */
  type: PricingRuleType;
  /** Human-readable description for admin interfaces */
  description: string;
  /** Whether this rule is currently active */
  enabled: boolean;
  /**
   * Priority for rule application (higher values applied first)
   * Used to resolve conflicts when multiple rules could apply
   * @default 0
   */
  priority?: number;
  /** The conditions that must be met for this rule to apply */
  condition: DurationCondition | TimeOfDayCondition | DayOfWeekCondition | CustomCondition;
  /**
   * Absolute price in cents (overrides base price calculation)
   * Used for duration-based flat rates
   */
  price?: number;
  /**
   * Price modification to apply when conditions are met
   * Used for surcharges, discounts, and percentage-based pricing
   */
  priceModifier?: PriceModifier;
}

/**
 * Conditions for duration-based pricing rules
 *
 * @example Different rates for different session lengths
 * ```typescript
 * const shortSession: DurationCondition = { maxDuration: 30 }; // <= 30 min
 * const mediumSession: DurationCondition = { minDuration: 31, maxDuration: 120 }; // 31-120 min
 * const longSession: DurationCondition = { minDuration: 121 }; // > 120 min
 * ```
 */
export interface DurationCondition {
  /** Minimum duration in minutes (inclusive) */
  minDuration?: number;
  /** Maximum duration in minutes (inclusive) */
  maxDuration?: number;
}

/**
 * Conditions for time-of-day based pricing rules
 * Supports both same-day and overnight time ranges
 *
 * @example Business hours (same day)
 * ```typescript
 * const businessHours: TimeOfDayCondition = {
 *   startTime: "09:00",
 *   endTime: "17:00"
 * };
 * ```
 *
 * @example Night hours (crosses midnight)
 * ```typescript
 * const nightHours: TimeOfDayCondition = {
 *   startTime: "22:00",
 *   endTime: "06:00"
 * };
 * ```
 */
export interface TimeOfDayCondition {
  /** Start time in HH:mm format (24-hour) */
  startTime: string;
  /** End time in HH:mm format (24-hour) */
  endTime: string;
}

/**
 * Conditions for day-of-week based pricing rules
 *
 * @example Weekend pricing
 * ```typescript
 * const weekendCondition: DayOfWeekCondition = {
 *   days: ["saturday", "sunday"]
 * };
 * ```
 *
 * @example Weekday pricing
 * ```typescript
 * const weekdayCondition: DayOfWeekCondition = {
 *   days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
 * };
 * ```
 */
export interface DayOfWeekCondition {
  /** Array of days when this rule applies */
  days: DayOfWeek[];
}

/**
 * Conditions for custom business logic rules
 * Extensible for future advanced features
 *
 * @example Custom holiday pricing
 * ```typescript
 * const holidayCondition: CustomCondition = {
 *   script: "isHoliday(date)",
 *   parameters: { holidayList: ["2024-12-25", "2024-01-01"] }
 * };
 * ```
 */
export interface CustomCondition {
  /** JavaScript code for custom evaluation (future feature) */
  script?: string;
  /** Parameters passed to custom evaluation function */
  parameters?: Record<string, unknown>;
}

/**
 * Price modification specification
 *
 * @example Fixed surcharge
 * ```typescript
 * const fixedSurcharge: PriceModifier = {
 *   type: "surcharge",
 *   value: 2500 // Add $25.00
 * };
 * ```
 *
 * @example Percentage discount
 * ```typescript
 * const percentageDiscount: PriceModifier = {
 *   type: "discount",
 *   value: 0,
 *   percentage: 20 // 20% off
 * };
 * ```
 *
 * @example Absolute price override
 * ```typescript
 * const absolutePrice: PriceModifier = {
 *   type: "absolute",
 *   value: 15000 // Set to exactly $150.00
 * };
 * ```
 */
export interface PriceModifier {
  /** Type of price modification */
  type: PriceModifierType;
  /** Fixed amount in cents (positive for surcharge, negative for discount) */
  value: number;
  /**
   * Percentage modifier (0-100)
   * When specified, takes precedence over fixed value
   */
  percentage?: number;
}

/**
 * Complete variable pricing configuration for an event type
 *
 * @example Complete pricing setup
 * ```typescript
 * const pricingConfig: VariablePricingConfig = {
 *   enabled: true,
 *   basePrice: 10000, // $100.00 base
 *   currency: "USD",
 *   rules: [
 *     // Weekend 25% surcharge
 *     {
 *       id: "weekend-premium",
 *       type: "dayOfWeek",
 *       description: "Weekend premium pricing",
 *       enabled: true,
 *       priority: 5,
 *       condition: { days: ["saturday", "sunday"] },
 *       priceModifier: { type: "surcharge", value: 0, percentage: 25 }
 *     },
 *     // Extended session flat rate
 *     {
 *       id: "extended-session",
 *       type: "duration",
 *       description: "Extended consultation (2+ hours)",
 *       enabled: true,
 *       priority: 10,
 *       condition: { minDuration: 120 },
 *       price: 20000 // $200 flat rate
 *     }
 *   ]
 * };
 * ```
 */
export interface VariablePricingConfig {
  /** Whether variable pricing is active for this event type */
  enabled: boolean;
  /** Base price in cents before any modifications */
  basePrice: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Array of pricing rules to evaluate */
  rules: PricingRule[];
}

/**
 * Context information for pricing calculations
 * Contains all data needed to evaluate pricing rules
 */
export interface PricingContext {
  /** Event type ID for reference */
  eventTypeId: number;
  /** Booking duration in minutes */
  duration: number;
  /** Booking start time */
  startTime: Date;
  /** Booking end time */
  endTime: Date;
  /** Timezone for time-based calculations */
  timezone: string;
  /** Day of week (0 = Sunday, 1 = Monday, etc.) */
  dayOfWeek: number;
}

/**
 * Individual item in price breakdown
 * Used to show transparent pricing calculations to users
 */
export interface PriceBreakdownItem {
  /** Human-readable description of this price component */
  description: string;
  /** Amount in cents (positive for charges, negative for discounts) */
  amount: number;
  /** Category of price component for styling/grouping */
  type: "base" | "surcharge" | "discount";
  /** Reference to the rule that generated this item (if applicable) */
  ruleId?: string;
}

/**
 * Complete result of price calculation
 * Includes breakdown for transparency and audit trails
 *
 * @example Calculation result
 * ```typescript
 * const result: PriceCalculationResult = {
 *   basePrice: 10000,
 *   totalPrice: 12500,
 *   currency: "USD",
 *   modifiers: [
 *     {
 *       description: "Weekend premium (25%)",
 *       amount: 2500,
 *       type: "surcharge",
 *       ruleId: "weekend-premium"
 *     }
 *   ],
 *   breakdown: [
 *     { description: "Base price", amount: 10000, type: "base" },
 *     { description: "Weekend premium (25%)", amount: 2500, type: "surcharge", ruleId: "weekend-premium" }
 *   ]
 * };
 * ```
 */
export interface PriceCalculationResult {
  /** Original base price before modifications */
  basePrice: number;
  /** Array of applied price modifiers */
  modifiers: PriceBreakdownItem[];
  /** Final calculated price in cents */
  totalPrice: number;
  /** Complete breakdown of all price components */
  breakdown: PriceBreakdownItem[];
  /** ISO 4217 currency code */
  currency: string;
}

/**
 * Metadata structure for event types with Stripe integration
 * Maintains backward compatibility with legacy pricing fields
 */
export interface EventTypeMetadataStripe {
  /** Whether Stripe payments are enabled (legacy) */
  enabled?: boolean;
  /** Legacy price field (deprecated - use variablePricing.basePrice) */
  price?: number;
  /** Legacy currency field (deprecated - use variablePricing.currency) */
  currency?: string;
  /** Variable pricing configuration */
  variablePricing?: VariablePricingConfig;
}

/**
 * Enhanced pricing rule with additional metadata for UI and validation
 */
export interface PricingRuleWithMetadata extends PricingRule {
  /** When this rule was created */
  createdAt?: Date;
  /** When this rule was last modified */
  updatedAt?: Date;
  /** Who created this rule */
  createdBy?: string;
  /** Whether this rule is currently being used in active bookings */
  isActive?: boolean;
  /** Usage statistics for analytics */
  usageStats?: {
    timesApplied: number;
    totalRevenue: number;
    lastUsed: Date;
  };
}

/**
 * Validation result for pricing configurations
 */
export interface PricingValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Array of validation errors */
  errors: string[];
  /** Array of validation warnings */
  warnings: string[];
}

/**
 * Advanced pricing context with additional business data
 */
export interface EnhancedPricingContext extends PricingContext {
  /** User's membership tier (for tiered pricing) */
  membershipTier?: "basic" | "premium" | "enterprise";
  /** Whether this is a repeat booking */
  isRepeatBooking?: boolean;
  /** Number of previous bookings by this user */
  bookingHistory?: number;
  /** Special occasion or event type */
  occasion?: "holiday" | "peak-season" | "off-season" | "special-event";
  /** Promotional code applied */
  promoCode?: string;
}

/**
 * Bulk pricing calculation request
 */
export interface BulkPricingRequest {
  /** Event type ID */
  eventTypeId: number;
  /** Array of booking scenarios to price */
  scenarios: Array<{
    id: string;
    duration: number;
    startTime: Date;
    endTime: Date;
    timezone: string;
  }>;
}

/**
 * Bulk pricing calculation result
 */
export interface BulkPricingResult {
  /** Results keyed by scenario ID */
  results: Record<string, PriceCalculationResult>;
  /** Overall statistics */
  statistics: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalScenarios: number;
  };
}
