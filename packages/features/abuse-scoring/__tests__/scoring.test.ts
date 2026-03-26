import { describe, expect, it } from "vitest";
import type { AbuseRuleGroupDto, UserForScoringDto } from "../dto/scoring.dto";
import { evaluateRules, extractMetrics } from "../lib/scoring";

/** Generates a deterministic UUID v7-shaped string from a number, for readable test fixtures. */
function uuid(n: number): string {
  return `019577a0-0000-7000-8000-${String(n).padStart(12, "0")}`;
}

type BookingOverride = Partial<UserForScoringDto["bookings"][number]> & { createdAt: Date };

function buildBooking(overrides: BookingOverride): UserForScoringDto["bookings"][number] {
  return {
    cancellationReason: null,
    location: null,
    responses: null,
    eventType: null,
    attendees: [{ email: "other@example.com" }],
    ...overrides,
  };
}

function buildUser(overrides: Partial<UserForScoringDto> = {}): UserForScoringDto {
  return {
    id: 1,
    email: "test@example.com",
    name: null,
    username: null,
    locked: false,
    abuseScore: 0,
    eventTypes: [],
    bookings: [],
    ...overrides,
  };
}

function buildRule(overrides: Partial<AbuseRuleGroupDto> = {}): AbuseRuleGroupDto {
  return {
    id: uuid(1),
    matchAll: true,
    weight: 25,
    autoLock: false,
    description: "test rule",
    conditions: [],
    ...overrides,
  };
}

// ── extractMetrics ──

describe("extractMetrics", () => {
  it("returns zeroed metrics for user with no activity", () => {
    const metrics = extractMetrics(buildUser());
    expect(metrics.eventTypeTitles).toHaveLength(0);
    expect(metrics.eventTypeDescriptions).toHaveLength(0);
    expect(metrics.redirectUrls).toHaveLength(0);
    expect(metrics.signupEmailDomain).toBe("example.com");
    expect(metrics.signupName).toBe("");
    expect(metrics.bookingVelocity.hour).toBe(0);
    expect(metrics.bookingVelocity.min).toBe(0);
    expect(metrics.selfBookingCount).toBe(0);
  });

  it("lowercases event type titles", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin MEETING",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    expect(metrics.eventTypeTitles).toEqual(["free bitcoin meeting"]);
  });

  it("lowercases descriptions and filters nulls", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: "Some Desc",
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
        {
          id: 2,
          userId: 1,
          title: "B",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    expect(metrics.eventTypeDescriptions).toEqual(["some desc"]);
  });

  it("extracts redirect URLs lowercased and filters nulls", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: null,
          successRedirectUrl: "https://Phishing.COM/Hook",
          forwardParamsSuccessRedirect: false,
        },
        {
          id: 2,
          userId: 1,
          title: "B",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    expect(metrics.redirectUrls).toEqual(["https://phishing.com/hook"]);
  });

  it("extracts email domain", () => {
    const metrics = extractMetrics(buildUser({ email: "bot@TempMail.org" }));
    expect(metrics.signupEmailDomain).toBe("tempmail.org");
  });

  it("uses name then username for signupName", () => {
    expect(extractMetrics(buildUser({ name: "John", username: "johnny" })).signupName).toBe("john");
    expect(extractMetrics(buildUser({ name: null, username: "Johnny" })).signupName).toBe("johnny");
    expect(extractMetrics(buildUser({ name: null, username: null })).signupName).toBe("");
  });

  it("extracts cancellation reasons and filters nulls", () => {
    const now = Date.now();
    const bookings = [
      buildBooking({ createdAt: new Date(now), cancellationReason: "Auto-Debit $499 Norton" }),
      buildBooking({ createdAt: new Date(now - 1000), cancellationReason: null }),
    ];
    const metrics = extractMetrics(buildUser({ bookings }));
    expect(metrics.cancellationReasons).toEqual(["auto-debit $499 norton"]);
  });

  it("extracts booking locations and filters nulls", () => {
    const now = Date.now();
    const bookings = [
      buildBooking({ createdAt: new Date(now), location: "https://telegra.ph/crypto-bonus" }),
      buildBooking({ createdAt: new Date(now - 1000), location: null }),
    ];
    const metrics = extractMetrics(buildUser({ bookings }));
    expect(metrics.bookingLocations).toEqual(["https://telegra.ph/crypto-bonus"]);
  });

  it("extracts string values from booking responses JSON", () => {
    const now = Date.now();
    const bookings = [
      buildBooking({
        createdAt: new Date(now),
        responses: { notes: "Visit telegra.ph/free-bitcoin", phone: "+1234567890" },
      }),
    ];
    const metrics = extractMetrics(buildUser({ bookings }));
    expect(metrics.bookingResponses).toContain("visit telegra.ph/free-bitcoin");
    expect(metrics.bookingResponses).toContain("+1234567890");
  });

  it("handles null and non-string responses gracefully", () => {
    const now = Date.now();
    const bookings = [
      buildBooking({ createdAt: new Date(now), responses: null }),
      buildBooking({ createdAt: new Date(now - 1000), responses: { count: 42, flag: true, note: "spam" } }),
    ];
    const metrics = extractMetrics(buildUser({ bookings }));
    expect(metrics.bookingResponses).toEqual(["spam"]);
  });

  it("extracts username", () => {
    expect(extractMetrics(buildUser({ username: "Btc-Support" })).username).toBe("btc-support");
    expect(extractMetrics(buildUser({ username: null })).username).toBe("");
  });

  it("computes peak hourly booking velocity", () => {
    const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
    const base = hourStart + 30 * 60_000;
    const bookings = Array.from({ length: 25 }, (_, i) =>
      buildBooking({ createdAt: new Date(base - i * 60_000) })
    );
    const metrics = extractMetrics(buildUser({ bookings }));
    expect(metrics.bookingVelocity.hour).toBe(25);
  });

  it("computes peak per-minute booking velocity", () => {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60_000) * 60_000;
    const bookings = Array.from({ length: 8 }, (_, i) =>
      buildBooking({ createdAt: new Date(minuteStart + i * 1000) })
    );
    const metrics = extractMetrics(buildUser({ bookings }));
    expect(metrics.bookingVelocity.min).toBe(8);
  });

  it("computes self-booking count from self-hosted bookings", () => {
    const now = Date.now();
    const bookings = Array.from({ length: 8 }, (_, i) =>
      buildBooking({ createdAt: new Date(now - i * 3_600_000), eventType: { userId: 1 } })
    );
    const metrics = extractMetrics(buildUser({ id: 1, bookings }));
    expect(metrics.selfBookingCount).toBe(8);
  });

  it("computes self-booking count from self-attendee bookings", () => {
    const now = Date.now();
    const bookings = Array.from({ length: 6 }, (_, i) =>
      buildBooking({
        createdAt: new Date(now - i * 3_600_000),
        eventType: { userId: 99 },
        attendees: [{ email: "test@example.com" }],
      })
    );
    const metrics = extractMetrics(buildUser({ id: 1, email: "test@example.com", bookings }));
    expect(metrics.selfBookingCount).toBe(6);
  });
});

// ── evaluateRules ──

describe("evaluateRules", () => {
  it("returns zero score with no rules", () => {
    const metrics = extractMetrics(buildUser());
    const result = evaluateRules(metrics, []);
    expect(result.score).toBe(0);
    expect(result.matchedRules).toHaveLength(0);
    expect(result.shouldAutoLock).toBe(false);
  });

  it("skips rules with no conditions", () => {
    const metrics = extractMetrics(buildUser());
    const result = evaluateRules(metrics, [buildRule({ conditions: [] })]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matches CONTAINS on event type title (case-insensitive)", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin Airdrop",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      weight: 25,
      conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "Bitcoin" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(1);
    expect(result.score).toBe(25);
  });

  it("matches CONTAINS on event type description", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Meeting",
          description: "Claim your free crypto tokens",
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "EVENT_TYPE_DESCRIPTION", operator: "CONTAINS", value: "crypto" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(1);
  });

  it("matches EXACT on redirect URL", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: null,
          successRedirectUrl: "https://phishing.com/hook",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      weight: 30,
      conditions: [
        { id: uuid(1), field: "REDIRECT_URL", operator: "EXACT", value: "https://phishing.com/hook" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(30);
  });

  it("matches EXACT on signup email domain (case-insensitive)", () => {
    const user = buildUser({ email: "bot@TempMail.org" });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      weight: 10,
      conditions: [{ id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN", operator: "EXACT", value: "tempmail.org" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(10);
  });

  it("matches CONTAINS on signup name", () => {
    const user = buildUser({ name: "Free Bitcoin Bot" });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "SIGNUP_NAME", operator: "CONTAINS", value: "bitcoin" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(1);
  });

  it("matches CONTAINS on cancellation reason", () => {
    const now = Date.now();
    const bookings = [
      buildBooking({ createdAt: new Date(now), cancellationReason: "Auto-Debit $499 Norton Antivirus" }),
    ];
    const metrics = extractMetrics(buildUser({ bookings }));
    const rule = buildRule({
      weight: 30,
      conditions: [{ id: uuid(1), field: "CANCELLATION_REASON", operator: "CONTAINS", value: "norton" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(30);
  });

  it("matches CONTAINS on booking location", () => {
    const now = Date.now();
    const bookings = [
      buildBooking({ createdAt: new Date(now), location: "https://telegra.ph/crypto-bonus" }),
    ];
    const metrics = extractMetrics(buildUser({ bookings }));
    const rule = buildRule({
      weight: 20,
      conditions: [{ id: uuid(1), field: "BOOKING_LOCATION", operator: "CONTAINS", value: "telegra.ph" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(20);
  });

  it("matches CONTAINS on booking responses", () => {
    const now = Date.now();
    const bookings = [
      buildBooking({
        createdAt: new Date(now),
        responses: { notes: "Visit resortguest.org for details" },
      }),
    ];
    const metrics = extractMetrics(buildUser({ bookings }));
    const rule = buildRule({
      weight: 25,
      conditions: [
        { id: uuid(1), field: "BOOKING_RESPONSES", operator: "CONTAINS", value: "resortguest.org" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(25);
  });

  it("matches CONTAINS on username", () => {
    const metrics = extractMetrics(buildUser({ username: "btc-support-helpdesk" }));
    const rule = buildRule({
      weight: 15,
      conditions: [{ id: uuid(1), field: "USERNAME", operator: "CONTAINS", value: "btc-support" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(15);
  });

  it("matches GREATER_THAN on hourly booking velocity", () => {
    const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
    const base = hourStart + 30 * 60_000;
    const bookings = Array.from({ length: 25 }, (_, i) =>
      buildBooking({ createdAt: new Date(base - i * 60_000) })
    );
    const metrics = extractMetrics(buildUser({ bookings }));
    const rule = buildRule({
      weight: 15,
      conditions: [{ id: uuid(1), field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "20/hour" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(15);
  });

  it("matches GREATER_THAN on per-minute booking velocity", () => {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60_000) * 60_000;
    const bookings = Array.from({ length: 8 }, (_, i) =>
      buildBooking({ createdAt: new Date(minuteStart + i * 1000) })
    );
    const metrics = extractMetrics(buildUser({ bookings }));
    const rule = buildRule({
      weight: 35,
      conditions: [{ id: uuid(1), field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "5/min" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(35);
  });

  it("does not match GREATER_THAN velocity at boundary", () => {
    const hourStart = Math.floor(Date.now() / 3600000) * 3600000;
    const base = hourStart + 30 * 60_000;
    const bookings = Array.from({ length: 20 }, (_, i) =>
      buildBooking({ createdAt: new Date(base - i * 60_000) })
    );
    const metrics = extractMetrics(buildUser({ bookings }));
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "20/hour" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("returns false for malformed velocity value", () => {
    const metrics = extractMetrics(buildUser());
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "50" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matches GREATER_THAN on self-booking count", () => {
    const now = Date.now();
    const bookings = Array.from({ length: 8 }, (_, i) =>
      buildBooking({
        createdAt: new Date(now - i * 3_600_000),
        eventType: { userId: 1 },
        attendees: [{ email: "test@example.com" }],
      })
    );
    const metrics = extractMetrics(buildUser({ id: 1, email: "test@example.com", bookings }));
    const rule = buildRule({
      weight: 15,
      conditions: [{ id: uuid(1), field: "SELF_BOOKING_COUNT", operator: "GREATER_THAN", value: "5" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(15);
  });

  // ── MATCHES_DOMAIN ──

  it("matches MATCHES_DOMAIN exact on signup email domain", () => {
    const metrics = extractMetrics(buildUser({ email: "user@tempmail.org" }));
    const rule = buildRule({
      weight: 10,
      conditions: [
        { id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN", operator: "MATCHES_DOMAIN", value: "tempmail.org" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(10);
  });

  it("matches MATCHES_DOMAIN wildcard on signup email domain", () => {
    const metrics = extractMetrics(buildUser({ email: "user@sub.tempmail.org" }));
    const rule = buildRule({
      weight: 10,
      conditions: [
        { id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN", operator: "MATCHES_DOMAIN", value: "*.tempmail.org" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(10);
  });

  it("MATCHES_DOMAIN wildcard does not match base domain", () => {
    const metrics = extractMetrics(buildUser({ email: "user@tempmail.org" }));
    const rule = buildRule({
      conditions: [
        { id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN", operator: "MATCHES_DOMAIN", value: "*.tempmail.org" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("MATCHES_DOMAIN is case-insensitive", () => {
    const metrics = extractMetrics(buildUser({ email: "user@TempMail.ORG" }));
    const rule = buildRule({
      weight: 10,
      conditions: [
        { id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN", operator: "MATCHES_DOMAIN", value: "tempmail.org" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(10);
  });

  it("MATCHES_DOMAIN extracts hostname from REDIRECT_URL", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: null,
          successRedirectUrl: "https://t.co/ajZ29kc",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      weight: 20,
      conditions: [{ id: uuid(1), field: "REDIRECT_URL", operator: "MATCHES_DOMAIN", value: "t.co" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(20);
  });

  it("MATCHES_DOMAIN does not match when hostname is only a suffix", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: null,
          successRedirectUrl: "https://companydomaint.co/path",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "REDIRECT_URL", operator: "MATCHES_DOMAIN", value: "t.co" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("MATCHES_DOMAIN wildcard matches base domain from URL", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: null,
          successRedirectUrl: "https://bit.ly/abc123",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      weight: 15,
      conditions: [{ id: uuid(1), field: "REDIRECT_URL", operator: "MATCHES_DOMAIN", value: "*.bit.ly" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(15);
  });

  it("MATCHES_DOMAIN returns false for malformed URL", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: null,
          successRedirectUrl: "not-a-url",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "REDIRECT_URL", operator: "MATCHES_DOMAIN", value: "t.co" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  // ── matchAll / OR logic ──

  it("matchAll=true requires ALL conditions to match", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      matchAll: true,
      conditions: [
        { id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" },
        { id: uuid(2), field: "SIGNUP_EMAIL_DOMAIN", operator: "EXACT", value: "tempmail.org" },
      ],
    });
    // Title matches, but domain is example.com, not tempmail.org
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matchAll=false matches if ANY condition matches", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      matchAll: false,
      conditions: [
        { id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" },
        { id: uuid(2), field: "SIGNUP_EMAIL_DOMAIN", operator: "EXACT", value: "tempmail.org" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(1);
  });

  // ── autoLock ──

  it("sets shouldAutoLock when rule has autoLock=true", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "btc transaction",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      weight: 0,
      autoLock: true,
      description: "Phishing title",
      conditions: [
        { id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "btc transaction" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.shouldAutoLock).toBe(true);
    expect(result.autoLockRule).toEqual({ groupId: uuid(1), description: "Phishing title" });
  });

  it("does not autoLock when rule is not matched", () => {
    const metrics = extractMetrics(buildUser());
    const rule = buildRule({
      autoLock: true,
      conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.shouldAutoLock).toBe(false);
  });

  // ── score accumulation ──

  it("accumulates score from multiple matched rules", () => {
    const user = buildUser({
      email: "bot@tempmail.org",
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rules = [
      buildRule({
        id: uuid(1),
        weight: 25,
        conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" }],
      }),
      buildRule({
        id: uuid(2),
        weight: 10,
        conditions: [{ id: uuid(2), field: "SIGNUP_EMAIL_DOMAIN", operator: "EXACT", value: "tempmail.org" }],
      }),
    ];
    const result = evaluateRules(metrics, rules);
    expect(result.score).toBe(35);
    expect(result.matchedRules).toHaveLength(2);
  });

  it("caps score at 100", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Free Bitcoin",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rules = [
      buildRule({
        id: uuid(1),
        weight: 60,
        conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" }],
      }),
      buildRule({
        id: uuid(2),
        weight: 60,
        conditions: [{ id: uuid(2), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "free" }],
      }),
    ];
    const result = evaluateRules(metrics, rules);
    expect(result.score).toBe(100);
  });

  // ── array field matching (ANY element) ──

  it("matches if ANY event type title contains keyword", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Normal Meeting",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
        {
          id: 2,
          userId: 1,
          title: "Claim Bitcoin Now",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(1);
  });

  it("does not match when no event type title contains keyword", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "Normal Meeting",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  // ── matchesVelocity edge cases ──

  it("returns false for velocity with NaN threshold", () => {
    const metrics = extractMetrics(buildUser());
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "abc/hour" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("returns false for velocity with unknown unit", () => {
    const metrics = extractMetrics(buildUser());
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "5/day" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  // ── matchesCondition edge cases ──

  it("returns false for unsupported operator on non-array field", () => {
    const metrics = extractMetrics(buildUser({ email: "user@example.com" }));
    const rule = buildRule({
      conditions: [
        { id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN", operator: "REGEX" as never, value: "example" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("does not match EXACT when value differs on non-array field", () => {
    const metrics = extractMetrics(buildUser({ email: "user@safe.com" }));
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "SIGNUP_EMAIL_DOMAIN", operator: "EXACT", value: "tempmail.org" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("does not match SELF_BOOKING_COUNT at boundary (not greater than)", () => {
    const now = Date.now();
    const bookings = Array.from({ length: 5 }, (_, i) =>
      buildBooking({
        createdAt: new Date(now - i * 3_600_000),
        eventType: { userId: 1 },
      })
    );
    const metrics = extractMetrics(buildUser({ id: 1, bookings }));
    const rule = buildRule({
      conditions: [{ id: uuid(1), field: "SELF_BOOKING_COUNT", operator: "GREATER_THAN", value: "5" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.matchedRules).toHaveLength(0);
  });

  // ── autoLockRule description fallback ──

  it("uses empty string for autoLockRule description when rule has null description", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "btc scam",
          description: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: null,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      autoLock: true,
      description: null as unknown as string,
      conditions: [{ id: uuid(1), field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "btc scam" }],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.shouldAutoLock).toBe(true);
    expect(result.autoLockRule?.description).toBe("");
  });

  // ── MATCHES_DOMAIN on REDIRECT_URL with subdomain URL ──

  it("MATCHES_DOMAIN wildcard matches subdomain in URL", () => {
    const user = buildUser({
      eventTypes: [
        {
          id: 1,
          userId: 1,
          title: "A",
          description: null,
          successRedirectUrl: "https://app.phishing.com/hook",
          forwardParamsSuccessRedirect: false,
        },
      ],
    });
    const metrics = extractMetrics(user);
    const rule = buildRule({
      weight: 20,
      conditions: [
        { id: uuid(1), field: "REDIRECT_URL", operator: "MATCHES_DOMAIN", value: "*.phishing.com" },
      ],
    });
    const result = evaluateRules(metrics, [rule]);
    expect(result.score).toBe(20);
  });
});
