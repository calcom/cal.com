import type { AbuseRuleGroupDto, UserForScoringDto } from "../dto/scoring.dto";
import type { RuleEvalResult, UserMetrics } from "../types";
import type { AbuseRuleField, VelocityUnit } from "./constants";
import { ARRAY_FIELDS, DOMAIN_FIELDS, MS_PER_DAY, NUMERIC_FIELDS, VELOCITY_FIELDS } from "./constants";

/**
 * Extracts derived metrics from user data for rule evaluation.
 * Pure function — no DB queries, no side effects.
 */
export function extractMetrics(user: UserForScoringDto): UserMetrics {
  const eventTypes = user.eventTypes ?? [];
  const bookings = user.bookings ?? [];

  // Booking velocity: peak bookings per hour and per minute
  const last24h = bookings.filter((b) => Date.now() - b.createdAt.getTime() < MS_PER_DAY);
  const hourBuckets = new Map<number, number>();
  const minuteBuckets = new Map<number, number>();
  for (const b of last24h) {
    const ts = b.createdAt.getTime();
    const hour = Math.floor(ts / 3_600_000);
    const minute = Math.floor(ts / 60_000);
    hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
    minuteBuckets.set(minute, (minuteBuckets.get(minute) ?? 0) + 1);
  }
  const bookingVelocityPerHour = Math.max(...Array.from(hourBuckets.values()), 0);
  const bookingVelocityPerMinute = Math.max(...Array.from(minuteBuckets.values()), 0);

  // Self-booking: on own EventType OR as attendee of own booking
  const selfHosted = bookings.filter((b) => b.eventType?.userId === user.id);
  const selfAttendee = bookings.filter((b) =>
    b.attendees?.some((a) => a.email.toLowerCase() === user.email.toLowerCase())
  );
  const selfBookingCount = Math.max(selfHosted.length, selfAttendee.length);

  // Extract text from booking responses JSON
  const bookingResponseTexts: string[] = [];
  for (const b of bookings) {
    if (!b.responses) continue;
    const responses = b.responses as Record<string, unknown>;
    for (const val of Object.values(responses)) {
      if (typeof val === "string" && val.trim()) {
        bookingResponseTexts.push(val.toLowerCase());
      }
    }
  }

  // Extract text from workflow step templates
  const workflows = user.workflows ?? [];
  const workflowContentTexts: string[] = [];
  for (const wf of workflows) {
    if (wf.name?.trim()) {
      workflowContentTexts.push(wf.name.toLowerCase());
    }
    for (const step of wf.steps) {
      if (typeof step.emailSubject === "string" && step.emailSubject.trim()) {
        workflowContentTexts.push(step.emailSubject.toLowerCase());
      }
      if (typeof step.reminderBody === "string" && step.reminderBody.trim()) {
        workflowContentTexts.push(step.reminderBody.toLowerCase());
      }
    }
  }

  return {
    eventTypeTitles: eventTypes.map((et) => et.title.toLowerCase()),
    eventTypeDescriptions: eventTypes.map((et) => et.description?.toLowerCase()).filter(Boolean) as string[],
    redirectUrls: eventTypes
      .map((et) => et.successRedirectUrl?.toLowerCase())
      .filter(Boolean) as string[],
    cancellationReasons: bookings
      .map((b) => b.cancellationReason?.toLowerCase())
      .filter(Boolean) as string[],
    bookingLocations: bookings.map((b) => b.location?.toLowerCase()).filter(Boolean) as string[],
    bookingResponses: bookingResponseTexts,
    workflowContent: workflowContentTexts,
    username: (user.username ?? "").toLowerCase(),
    signupEmailDomain: user.email.split("@")[1]?.toLowerCase() ?? "",
    signupName: (user.name ?? user.username ?? "").toLowerCase(),
    bookingVelocity: { hour: bookingVelocityPerHour, min: bookingVelocityPerMinute },
    selfBookingCount,
  };
}

function getFieldValues(metrics: UserMetrics, field: AbuseRuleField): string[] {
  switch (field) {
    case "EVENT_TYPE_TITLE":
      return metrics.eventTypeTitles;
    case "EVENT_TYPE_DESCRIPTION":
      return metrics.eventTypeDescriptions;
    case "REDIRECT_URL":
      return metrics.redirectUrls;
    case "CANCELLATION_REASON":
      return metrics.cancellationReasons;
    case "BOOKING_LOCATION":
      return metrics.bookingLocations;
    case "BOOKING_RESPONSES":
      return metrics.bookingResponses;
    case "WORKFLOW_CONTENT":
      return metrics.workflowContent;
    case "USERNAME":
      return [metrics.username];
    case "SIGNUP_EMAIL_DOMAIN":
      return [metrics.signupEmailDomain];
    case "SIGNUP_NAME":
      return [metrics.signupName];
    case "BOOKING_VELOCITY":
      // Velocity values are resolved in matchesVelocity, not here
      return [];
    case "SELF_BOOKING_COUNT":
      return [String(metrics.selfBookingCount)];
  }
}

/**
 * Matches a domain value against a pattern that supports wildcard prefixes.
 * - Exact: "cal.com" matches only "cal.com"
 * - Wildcard: "*.cal.com" matches "app.cal.com", "sub.app.cal.com", but not "cal.com"
 */
function matchesDomain(fieldValue: string, pattern: string): boolean {
  let domain = fieldValue.toLowerCase();
  let extractedFromUrl = false;
  if (domain.includes("://")) {
    try {
      domain = new URL(domain).hostname;
      extractedFromUrl = true;
    } catch {
      return false;
    }
  }

  const normalizedPattern = pattern.toLowerCase();

  if (normalizedPattern.startsWith("*.")) {
    const baseDomain = normalizedPattern.slice(2);
    // When extracted from a URL, also match the base domain itself
    // (e.g. "*.bit.ly" matches "https://bit.ly/abc" since hostname is "bit.ly")
    if (extractedFromUrl && domain === baseDomain) return true;
    return domain.endsWith(`.${baseDomain}`);
  }

  return domain === normalizedPattern;
}

/**
 * Matches a compound velocity condition (e.g. "50/hour", "5/min") against
 * pre-computed velocity metrics. Returns false for malformed values.
 */
function matchesVelocity(metrics: UserMetrics, conditionValue: string): boolean {
  const separatorIndex = conditionValue.indexOf("/");
  if (separatorIndex === -1) return false;

  const threshold = Number(conditionValue.slice(0, separatorIndex));
  if (Number.isNaN(threshold)) return false;

  const unit = conditionValue.slice(separatorIndex + 1) as VelocityUnit;

  if (!(unit in metrics.bookingVelocity)) return false;

  return metrics.bookingVelocity[unit] > threshold;
}

function matchesCondition(
  metrics: UserMetrics,
  fieldValues: string[],
  operator: string,
  conditionValue: string,
  field: string
): boolean {
  const typedField = field as AbuseRuleField;
  const isNumeric = NUMERIC_FIELDS.has(typedField);
  const isArray = ARRAY_FIELDS.has(typedField);
  const isDomain = DOMAIN_FIELDS.has(typedField);
  const isVelocity = VELOCITY_FIELDS.has(typedField);

  if (isVelocity && operator === "GREATER_THAN") {
    return matchesVelocity(metrics, conditionValue);
  }

  const lowerValue = conditionValue.toLowerCase();

  const check = (fv: string): boolean => {
    if (isNumeric && operator === "GREATER_THAN") {
      return Number(fv) > Number(conditionValue);
    }
    if (operator === "MATCHES_DOMAIN" && isDomain) {
      return matchesDomain(fv, conditionValue);
    }
    const lowerFv = fv.toLowerCase();
    if (operator === "CONTAINS") return lowerFv.includes(lowerValue);
    if (operator === "EXACT") return lowerFv === lowerValue;
    return false;
  };

  if (isArray) return fieldValues.some(check);
  return fieldValues.length > 0 && check(fieldValues[0]);
}

/**
 * Evaluates rules against user metrics. Pure function.
 * Returns score (capped at 100), matched rules, and auto-lock decision.
 */
export function evaluateRules(
  metrics: UserMetrics,
  rules: AbuseRuleGroupDto[]
): RuleEvalResult {
  const matchedRules: RuleEvalResult["matchedRules"] = [];
  let shouldAutoLock = false;
  let autoLockRule: RuleEvalResult["autoLockRule"];

  for (const rule of rules) {
    if (rule.conditions.length === 0) continue;

    const conditionResults = rule.conditions.map((c) => {
      const fieldValues = getFieldValues(metrics, c.field);
      return matchesCondition(metrics, fieldValues, c.operator, c.value, c.field);
    });

    const groupMatches = rule.matchAll
      ? conditionResults.every(Boolean)
      : conditionResults.some(Boolean);

    if (groupMatches) {
      matchedRules.push({
        groupId: rule.id,
        weight: rule.weight,
        description: rule.description ?? "",
      });

      if (rule.autoLock) {
        shouldAutoLock = true;
        autoLockRule = { groupId: rule.id, description: rule.description ?? "" };
      }
    }
  }

  const score = Math.min(
    matchedRules.reduce((sum, r) => sum + r.weight, 0),
    100
  );

  return { score, matchedRules, shouldAutoLock, autoLockRule };
}
