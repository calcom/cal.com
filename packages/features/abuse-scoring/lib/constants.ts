export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Valid enum values — single source of truth for Zod schemas and TypeScript types ──

export const ABUSE_LOCKED_REASONS = ["score_threshold", "auto_lock_rule", "manual", "velocity"] as const;
export type AbuseLockedReason = (typeof ABUSE_LOCKED_REASONS)[number];

// ── Rule engine field/operator enums ──

export const ABUSE_RULE_FIELDS = [
  "EVENT_TYPE_TITLE",
  "EVENT_TYPE_DESCRIPTION",
  "REDIRECT_URL",
  "CANCELLATION_REASON",
  "BOOKING_LOCATION",
  "BOOKING_RESPONSES",
  "WORKFLOW_CONTENT",
  "USERNAME",
  "SIGNUP_EMAIL_DOMAIN",
  "SIGNUP_NAME",
  "BOOKING_VELOCITY",
  "SELF_BOOKING_COUNT",
] as const;
export type AbuseRuleField = (typeof ABUSE_RULE_FIELDS)[number];

export const ABUSE_RULE_OPERATORS = ["CONTAINS", "EXACT", "GREATER_THAN", "MATCHES_DOMAIN"] as const;
export type AbuseRuleOperator = (typeof ABUSE_RULE_OPERATORS)[number];

export const NUMERIC_FIELDS = new Set<AbuseRuleField>(["SELF_BOOKING_COUNT"]);
export const ARRAY_FIELDS = new Set<AbuseRuleField>([
  "EVENT_TYPE_TITLE",
  "EVENT_TYPE_DESCRIPTION",
  "REDIRECT_URL",
  "CANCELLATION_REASON",
  "BOOKING_LOCATION",
  "BOOKING_RESPONSES",
  "WORKFLOW_CONTENT",
]);
/** Fields that support the MATCHES_DOMAIN operator (exact + wildcard domain matching) */
export const DOMAIN_FIELDS = new Set<AbuseRuleField>(["SIGNUP_EMAIL_DOMAIN", "REDIRECT_URL"]);
/** Fields that use compound velocity format (e.g. "50/hour", "5/min") */
export const VELOCITY_FIELDS = new Set<AbuseRuleField>(["BOOKING_VELOCITY"]);
export const VELOCITY_UNITS = ["hour", "min"] as const;
export type VelocityUnit = (typeof VELOCITY_UNITS)[number];

// ── Thresholds ──

/** Bookings/hour threshold for Gate 3 velocity check (unflagged accounts) */
export const VELOCITY_GATE_THRESHOLD = 20;

/** Max recent bookings loaded per user during scoring */
export const SCORING_BOOKINGS_LIMIT = 200;

/** Fallback monitoring window if AbuseScoringConfig row is missing */
export const ABUSE_MONITORING_WINDOW_DAYS = 7;
