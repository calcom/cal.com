import type { UserForScoringDto } from "../dto/scoring.dto";
import type { AbuseSignal } from "../types";
import { ABUSE_SIGNAL_CAPS, ABUSE_WEIGHTS, MS_PER_DAY, SIGNUP_FLAG_CAP } from "./constants";

interface ScoreResult {
  score: number;
  signals: AbuseSignal[];
}

/**
 * Pure scoring function — no DB queries, no side effects.
 * @param user - Zod-validated DTO from repository
 * @param maliciousDomains - Set of lowercase domains from REDIRECT_DOMAIN Watchlist
 * @param spamKeywords - Lowercased SPAM_KEYWORD values from Watchlist
 */
export function calculateScore(
  user: UserForScoringDto,
  maliciousDomains: Set<string>,
  spamKeywords: string[]
): ScoreResult {
  const signals: AbuseSignal[] = [];
  const now = new Date().toISOString();

  // ── Signup signals ──
  const flagCount = user.abuseData?.flags?.length ?? 0;
  if (flagCount > 0) {
    signals.push({
      type: "signup_flags",
      weight: Math.min(flagCount * ABUSE_WEIGHTS.signupFlag, SIGNUP_FLAG_CAP),
      context: `${flagCount} pattern(s) matched at signup`,
      at: now,
    });
  }

  // ── Redirect signals (domain-list based, not "all external") ──
  const eventTypes = user.eventTypes ?? [];
  const redirectUrls = eventTypes
    .map((et) => ({ url: et.successRedirectUrl, forwardParams: et.forwardParamsSuccessRedirect, id: et.id }))
    .filter((r): r is { url: string; forwardParams: boolean | null; id: number } => Boolean(r.url));

  if (redirectUrls.length > 0 && maliciousDomains.size > 0) {
    const matchedDomains: string[] = [];
    let hasForwardParams = false;

    for (const r of redirectUrls) {
      try {
        const domain = new URL(r.url).hostname.toLowerCase();
        if (maliciousDomains.has(domain)) {
          matchedDomains.push(domain);
          if (r.forwardParams) hasForwardParams = true;
        }
      } catch {
        // Invalid URL — skip
      }
    }

    const uniqueDomains = Array.from(new Set(matchedDomains));
    if (uniqueDomains.length > 0) {
      signals.push({
        type: "redirect_malicious",
        weight: ABUSE_WEIGHTS.redirectMalicious,
        context: `${uniqueDomains.join(", ")} (${matchedDomains.length} EventType(s))`,
        at: now,
      });

      if (hasForwardParams) {
        signals.push({
          type: "forward_params_enabled",
          weight: ABUSE_WEIGHTS.forwardParams,
          context: "Forward params with malicious redirect",
          at: now,
        });
      }
    }
  }

  // ── Content spam signals (title only — description/username/booking metadata are future vectors) ──
  if (eventTypes.length > 0 && spamKeywords.length > 0) {
    const matched: string[] = [];
    for (const et of eventTypes) {
      const title = et.title.toLowerCase();
      for (const kw of spamKeywords) {
        if (title.includes(kw)) matched.push(kw);
      }
    }
    const unique = Array.from(new Set(matched));
    if (unique.length > 0) {
      signals.push({
        type: "content_spam",
        weight: ABUSE_WEIGHTS.contentSpam,
        context: `${unique.join(", ")} in ${eventTypes.length} EventType(s)`,
        at: now,
      });
    }
  }

  // ── Booking velocity signals ──
  const bookings = user.bookings ?? [];
  if (bookings.length > 0) {
    const last24h = bookings.filter((b) => Date.now() - b.createdAt.getTime() < MS_PER_DAY);

    const hourBuckets = new Map<number, number>();
    for (const b of last24h) {
      const hour = Math.floor(b.createdAt.getTime() / 3600000);
      hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
    }
    const peakPerHour = Math.max(...Array.from(hourBuckets.values()), 0);

    if (peakPerHour > 50) {
      signals.push({
        type: "high_booking_velocity",
        weight: ABUSE_WEIGHTS.highBookingVelocity,
        context: `${peakPerHour} bookings in peak hour`,
        at: now,
      });
    } else if (peakPerHour > 20) {
      signals.push({
        type: "elevated_booking_velocity",
        weight: ABUSE_WEIGHTS.elevatedBookingVelocity,
        context: `${peakPerHour} bookings in peak hour`,
        at: now,
      });
    }

    // Self-booking: on own EventType OR as attendee of own booking
    const selfHosted = bookings.filter((b) => b.eventType?.userId === user.id);
    const selfAttendee = bookings.filter((b) =>
      b.attendees?.some((a) => a.email.toLowerCase() === user.email.toLowerCase())
    );
    const selfBookingCount = Math.max(selfHosted.length, selfAttendee.length);

    if (selfBookingCount > 5) {
      signals.push({
        type: "self_booking_pattern",
        weight: ABUSE_WEIGHTS.selfBookingPattern,
        context: `${selfBookingCount} self-bookings`,
        at: now,
      });
    }
  }

  // ── Deduplicate by type: apply caps ──
  const cappedSignals = applySignalCaps(signals);

  const score = Math.min(
    cappedSignals.reduce((sum, s) => sum + s.weight, 0),
    100
  );

  return { score, signals: cappedSignals };
}

/**
 * If the same signal type appears multiple times, keep only the first
 * occurrence and cap its weight to the defined maximum.
 * Signals without a cap pass through unchanged.
 */
function applySignalCaps(signals: AbuseSignal[]): AbuseSignal[] {
  const seen = new Map<string, AbuseSignal>();

  for (const signal of signals) {
    const existing = seen.get(signal.type);
    if (!existing) {
      const cap = ABUSE_SIGNAL_CAPS[signal.type];
      seen.set(signal.type, cap != null ? { ...signal, weight: Math.min(signal.weight, cap) } : signal);
    }
  }

  return Array.from(seen.values());
}
