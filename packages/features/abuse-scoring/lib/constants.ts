export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Valid enum values — single source of truth for Zod schemas and TypeScript types ──

export const ABUSE_FLAG_TYPES = ["email_pattern", "suspicious_domain", "spam_keyword"] as const;
export type AbuseFlagType = (typeof ABUSE_FLAG_TYPES)[number];

export const ABUSE_SIGNAL_TYPES = [
  "signup_flags",
  "content_spam",
  "redirect_malicious",
  "forward_params_enabled",
  "high_booking_velocity",
  "elevated_booking_velocity",
  "self_booking_pattern",
] as const;
export type AbuseSignalType = (typeof ABUSE_SIGNAL_TYPES)[number];

export const ABUSE_LOCKED_REASONS = ["score_threshold", "manual", "velocity"] as const;
export type AbuseLockedReason = (typeof ABUSE_LOCKED_REASONS)[number];

// ── Thresholds and weights — hardcoded for phase 1, admin-configurable interface planned ──

export const ABUSE_THRESHOLDS = {
  alert: 50,
  lock: 80,
} as const;

export const ABUSE_WEIGHTS = {
  signupFlag: 10,
  contentSpam: 25,
  redirectMalicious: 30,
  forwardParams: 15,
  highBookingVelocity: 35,
  elevatedBookingVelocity: 15,
  selfBookingPattern: 15,
} as const;

/** Cap per signal type — prevents stacking from multiple EventTypes */
export const ABUSE_SIGNAL_CAPS: Partial<Record<AbuseSignalType, number>> = {
  content_spam: 25,
  redirect_malicious: 30,
  forward_params_enabled: 15,
};

/** Maximum score from signup flags alone */
export const SIGNUP_FLAG_CAP = 20;

/** Bookings/hour threshold for Gate 3 velocity check (unflagged accounts) */
export const VELOCITY_GATE_THRESHOLD = 20;

/** Max recent bookings loaded per user during scoring */
export const SCORING_BOOKINGS_LIMIT = 200;

export const ABUSE_MONITORING_WINDOW_DAYS = 7;
