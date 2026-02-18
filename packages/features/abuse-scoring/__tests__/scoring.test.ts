import { describe, it, expect, vi, afterEach } from "vitest";

import type { UserForScoringDto } from "../dto/scoring.dto";
import { ABUSE_WEIGHTS, SIGNUP_FLAG_CAP } from "../lib/constants";
import { calculateScore } from "../lib/scoring";

function buildUser(overrides: Partial<UserForScoringDto> = {}): UserForScoringDto {
  return {
    id: 1,
    email: "test@example.com",
    abuseData: null,
    locked: false,
    abuseScore: 0,
    eventTypes: [],
    bookings: [],
    ...overrides,
  };
}

function buildAbuseData(flagCount: number) {
  return {
    flags: Array.from({ length: flagCount }, (_, i) => ({
      type: "suspicious_domain" as const,
      domain: `tempmail${i}.org`,
      at: "2026-02-10T14:30:00Z",
    })),
    signals: [],
    lastAnalyzedAt: null,
  };
}

describe("calculateScore", () => {
  const emptyDomains = new Set<string>();
  const emptyKeywords: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns zero for user with no flags and no activity", () => {
    const user = buildUser();
    const result = calculateScore(user, emptyDomains, emptyKeywords);
    expect(result.score).toBe(0);
    expect(result.signals).toHaveLength(0);
  });

  it("scores signup flags at 10 per flag, capped at 20", () => {
    const user = buildUser({ abuseData: buildAbuseData(1) });
    const result = calculateScore(user, emptyDomains, emptyKeywords);
    expect(result.score).toBe(ABUSE_WEIGHTS.signupFlag);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].type).toBe("signup_flags");
    expect(result.signals[0].weight).toBe(10);
  });

  it("caps signup flags at SIGNUP_FLAG_CAP (20)", () => {
    const user = buildUser({ abuseData: buildAbuseData(5) });
    const result = calculateScore(user, emptyDomains, emptyKeywords);
    expect(result.signals[0].weight).toBe(SIGNUP_FLAG_CAP);
    expect(result.score).toBe(20);
  });

  it("detects malicious redirect domains", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Meeting",
          successRedirectUrl: "https://phishing-cal.com/success",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const domains = new Set(["phishing-cal.com"]);
    const result = calculateScore(user, domains, emptyKeywords);

    const redirectSignal = result.signals.find((s) => s.type === "redirect_malicious");
    expect(redirectSignal).toBeDefined();
    expect(redirectSignal!.weight).toBe(ABUSE_WEIGHTS.redirectMalicious);
  });

  it("adds forward_params signal when forwardParams is true with malicious redirect", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Meeting",
          successRedirectUrl: "https://phishing-cal.com/success",
          forwardParamsSuccessRedirect: true,
        },
      ],
    });
    const domains = new Set(["phishing-cal.com"]);
    const result = calculateScore(user, domains, emptyKeywords);

    const forwardSignal = result.signals.find((s) => s.type === "forward_params_enabled");
    expect(forwardSignal).toBeDefined();
    expect(forwardSignal!.weight).toBe(ABUSE_WEIGHTS.forwardParams);
  });

  it("does not flag redirects to non-watchlisted domains", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Meeting",
          successRedirectUrl: "https://mycompany.com/thanks",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const domains = new Set(["phishing-cal.com"]);
    const result = calculateScore(user, domains, emptyKeywords);
    expect(result.signals).toHaveLength(0);
  });

  it("detects spam keywords in EventType titles", () => {
    const user = buildUser({
      eventTypes: [
        { id: 1, userId: 1, title: "Free Bitcoin Airdrop", successRedirectUrl: null, forwardParamsSuccessRedirect: null },
      ],
    });
    const keywords = ["bitcoin", "airdrop"];
    const result = calculateScore(user, emptyDomains, keywords);

    const spamSignal = result.signals.find((s) => s.type === "content_spam");
    expect(spamSignal).toBeDefined();
    expect(spamSignal!.weight).toBe(ABUSE_WEIGHTS.contentSpam);
    expect(spamSignal!.context).toContain("bitcoin");
    expect(spamSignal!.context).toContain("airdrop");
  });

  it("detects elevated booking velocity (>20/hr)", () => {
    // Pin base time to 30 min past an epoch-hour boundary so all bookings stay in same bucket
    const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
    const base = hourStart + 30 * 60_000;
    const bookings = Array.from({ length: 25 }, (_, i) => ({
      createdAt: new Date(base - i * 60_000),
      eventType: null,
      attendees: [{ email: "other@example.com" }],
    }));

    const user = buildUser({ bookings });
    const result = calculateScore(user, emptyDomains, emptyKeywords);

    const velocitySignal = result.signals.find(
      (s) => s.type === "elevated_booking_velocity" || s.type === "high_booking_velocity"
    );
    expect(velocitySignal).toBeDefined();
  });

  it("detects high booking velocity (>50/hr)", () => {
    // Pin base time to 50 min past an epoch-hour boundary so all 55 bookings stay in same bucket
    const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
    const base = hourStart + 50 * 60_000;
    const bookings = Array.from({ length: 55 }, (_, i) => ({
      createdAt: new Date(base - i * 30_000),
      eventType: null,
      attendees: [{ email: "other@example.com" }],
    }));

    const user = buildUser({ bookings });
    const result = calculateScore(user, emptyDomains, emptyKeywords);

    const highSignal = result.signals.find((s) => s.type === "high_booking_velocity");
    expect(highSignal).toBeDefined();
    expect(highSignal!.weight).toBe(ABUSE_WEIGHTS.highBookingVelocity);
  });

  it("detects self-booking pattern (>5)", () => {
    const now = Date.now();
    const bookings = Array.from({ length: 8 }, (_, i) => ({
      createdAt: new Date(now - i * 3_600_000),
      eventType: { userId: 1 },
      attendees: [{ email: "test@example.com" }],
    }));

    const user = buildUser({ id: 1, email: "test@example.com", bookings });
    const result = calculateScore(user, emptyDomains, emptyKeywords);

    const selfSignal = result.signals.find((s) => s.type === "self_booking_pattern");
    expect(selfSignal).toBeDefined();
    expect(selfSignal!.weight).toBe(ABUSE_WEIGHTS.selfBookingPattern);
  });

  it("does not detect self-booking at threshold (<=5)", () => {
    const now = Date.now();
    const bookings = Array.from({ length: 5 }, (_, i) => ({
      createdAt: new Date(now - i * 3_600_000),
      eventType: { userId: 1 },
      attendees: [{ email: "test@example.com" }],
    }));

    const user = buildUser({ id: 1, email: "test@example.com", bookings });
    const result = calculateScore(user, emptyDomains, emptyKeywords);

    const selfSignal = result.signals.find((s) => s.type === "self_booking_pattern");
    expect(selfSignal).toBeUndefined();
  });

  it("caps score at 100", () => {
    const now = Date.now();
    const user = buildUser({
      abuseData: buildAbuseData(3),
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin Airdrop",
          successRedirectUrl: "https://phishing-cal.com/success",
          forwardParamsSuccessRedirect: true,
        },
      ],
      bookings: Array.from({ length: 55 }, (_, i) => ({
        createdAt: new Date(now - i * 30_000),
        eventType: { userId: 1 },
        attendees: [{ email: "test@example.com" }],
      })),
    });

    const domains = new Set(["phishing-cal.com"]);
    const keywords = ["bitcoin", "airdrop"];
    const result = calculateScore(user, domains, keywords);
    expect(result.score).toBe(100);
  });

  it("applies signal caps correctly", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Meeting",
          successRedirectUrl: "https://phishing-cal.com/a",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const domains = new Set(["phishing-cal.com"]);
    const result = calculateScore(user, domains, emptyKeywords);

    const redirectSignal = result.signals.find((s) => s.type === "redirect_malicious");
    expect(redirectSignal!.weight).toBeLessThanOrEqual(30);
  });

  it("ignores invalid redirect URLs", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Meeting",
          successRedirectUrl: "not-a-valid-url",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const domains = new Set(["phishing-cal.com"]);
    const result = calculateScore(user, domains, emptyKeywords);
    expect(result.signals).toHaveLength(0);
  });

  it("combines multiple signal types correctly", () => {
    const user = buildUser({
      abuseData: buildAbuseData(2),
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin Claim",
          successRedirectUrl: "https://phishing-cal.com/hook",
          forwardParamsSuccessRedirect: true,
        },
      ],
    });
    const domains = new Set(["phishing-cal.com"]);
    const keywords = ["bitcoin"];
    const result = calculateScore(user, domains, keywords);

    // signup_flags (20) + redirect_malicious (30) + forward_params (15) + content_spam (25) = 90
    expect(result.score).toBe(90);
    expect(result.signals).toHaveLength(4);
  });
});
