export type PricingRuleType = "duration" | "timeOfDay" | "dayOfWeek" | "custom";

export type PriceModifierType = "surcharge" | "discount" | "absolute";

export interface PricingRule {
  id: string;
  type: PricingRuleType;
  description: string;
  enabled: boolean;
  priority?: number;
  condition: DurationCondition | TimeOfDayCondition | DayOfWeekCondition | CustomCondition;
  price?: number; // Absolute price in cents
  priceModifier?: PriceModifier; // For surcharges/discounts
}

export interface DurationCondition {
  minDuration?: number; // in minutes
  maxDuration?: number; // in minutes
}

export interface TimeOfDayCondition {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface DayOfWeekCondition {
  days: string[]; // ["monday", "tuesday", etc.]
}

export interface CustomCondition {
  script?: string; // For future extensibility
  parameters?: Record<string, any>;
}

export interface PriceModifier {
  type: PriceModifierType;
  value: number; // Amount in cents
  percentage?: number; // For percentage-based modifiers
}

export interface VariablePricingConfig {
  enabled: boolean;
  basePrice: number; // in cents
  currency: string;
  rules: PricingRule[];
}

export interface PricingContext {
  duration: number; // in minutes
  startTime: Date;
  endTime: Date;
  timezone: string;
  eventTypeId: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
}

export interface PriceBreakdownItem {
  description: string;
  amount: number; // in cents
  type: "base" | "surcharge" | "discount";
  ruleId?: string;
}

export interface PriceCalculationResult {
  basePrice: number;
  modifiers: PriceBreakdownItem[];
  totalPrice: number;
  breakdown: PriceBreakdownItem[];
  currency: string;
}

export interface EventTypeMetadataStripe {
  enabled?: boolean;
  price?: number; // Deprecated - for backwards compatibility
  currency?: string;
  variablePricing?: VariablePricingConfig;
  // ... other stripe metadata
}