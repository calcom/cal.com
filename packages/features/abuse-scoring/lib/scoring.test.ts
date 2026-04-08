import { describe, expect, it } from "vitest";

import type { UserMetrics } from "../types";
import { evaluateRules, extractMetrics } from "./scoring";

function makeMetrics(overrides: Partial<UserMetrics> = {}): UserMetrics {
  return {
    eventTypeTitles: [],
    eventTypeDescriptions: [],
    redirectUrls: [],
    cancellationReasons: [],
    bookingLocations: [],
    bookingResponses: [],
    workflowContent: [],
    username: "testuser",
    signupEmailDomain: "test.com",
    signupName: "test user",
    bookingVelocity: { hour: 0, min: 0 },
    selfBookingCount: 0,
    ...overrides,
  };
}

describe("extractMetrics", () => {
  it("returns default metrics for user with no data", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      name: "Test User",
      eventTypes: [],
      bookings: [],
      workflows: [],
    };
    const metrics = extractMetrics(user);
    expect(metrics.username).toBe("testuser");
    expect(metrics.signupEmailDomain).toBe("example.com");
    expect(metrics.signupName).toBe("test user");
    expect(metrics.selfBookingCount).toBe(0);
    expect(metrics.bookingVelocity).toEqual({ hour: 0, min: 0 });
    expect(metrics.eventTypeTitles).toEqual([]);
  });

  it("extracts event type titles and descriptions", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      name: "Test",
      eventTypes: [
        { title: "Meeting", description: "A description", successRedirectUrl: null },
        { title: "Call", description: null, successRedirectUrl: "https://example.com" },
      ],
      bookings: [],
      workflows: [],
    };
    const metrics = extractMetrics(user);
    expect(metrics.eventTypeTitles).toEqual(["meeting", "call"]);
    expect(metrics.eventTypeDescriptions).toEqual(["a description"]);
    expect(metrics.redirectUrls).toEqual(["https://example.com"]);
  });

  it("extracts workflow content from step templates", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      name: "Test",
      eventTypes: [],
      bookings: [],
      workflows: [
        {
          name: "My Workflow",
          steps: [
            { emailSubject: "Reminder Subject", reminderBody: "Body text" },
            { emailSubject: null, reminderBody: null },
          ],
        },
      ],
    };
    const metrics = extractMetrics(user);
    expect(metrics.workflowContent).toContain("my workflow");
    expect(metrics.workflowContent).toContain("reminder subject");
    expect(metrics.workflowContent).toContain("body text");
  });

  it("counts self-bookings", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      name: "Test",
      eventTypes: [],
      bookings: [
        {
          createdAt: new Date(),
          eventType: { userId: 1 },
          attendees: [],
          location: null,
          cancellationReason: null,
          responses: null,
        },
        {
          createdAt: new Date(),
          eventType: { userId: 2 },
          attendees: [{ email: "test@example.com" }],
          location: null,
          cancellationReason: null,
          responses: null,
        },
      ],
      workflows: [],
    };
    const metrics = extractMetrics(user);
    expect(metrics.selfBookingCount).toBeGreaterThanOrEqual(1);
  });

  it("extracts booking response texts", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      username: "testuser",
      name: "Test",
      eventTypes: [],
      bookings: [
        {
          createdAt: new Date(),
          eventType: null,
          attendees: [],
          location: null,
          cancellationReason: null,
          responses: { notes: "Some important note", company: "Acme" },
        },
      ],
      workflows: [],
    };
    const metrics = extractMetrics(user);
    expect(metrics.bookingResponses).toContain("some important note");
    expect(metrics.bookingResponses).toContain("acme");
  });

  it("falls back to username when name is null", () => {
    const user = {
      id: 1,
      email: "test@example.com",
      username: "myuser",
      name: null,
      eventTypes: [],
      bookings: [],
      workflows: [],
    };
    const metrics = extractMetrics(user);
    expect(metrics.signupName).toBe("myuser");
  });
});

describe("evaluateRules", () => {
  it("returns zero score with no rules", () => {
    const result = evaluateRules(makeMetrics(), []);
    expect(result.score).toBe(0);
    expect(result.matchedRules).toEqual([]);
    expect(result.shouldAutoLock).toBe(false);
  });

  it("skips rules with empty conditions", () => {
    const result = evaluateRules(makeMetrics(), [
      { id: "rule-1", conditions: [], weight: 10, matchAll: false, autoLock: false, description: "empty" },
    ]);
    expect(result.score).toBe(0);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("matches CONTAINS operator on array fields", () => {
    const metrics = makeMetrics({ eventTypeTitles: ["free bitcoin giveaway"] });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "bitcoin" }],
        weight: 20,
        matchAll: false,
        autoLock: false,
        description: "crypto spam",
      },
    ]);
    expect(result.score).toBe(20);
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0].groupId).toBe("rule-1");
  });

  it("matches EXACT operator on single fields", () => {
    const metrics = makeMetrics({ username: "spammer" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "USERNAME", operator: "EXACT", value: "spammer" }],
        weight: 50,
        matchAll: false,
        autoLock: false,
        description: "known spammer",
      },
    ]);
    expect(result.score).toBe(50);
  });

  it("matches GREATER_THAN on numeric fields", () => {
    const metrics = makeMetrics({ selfBookingCount: 15 });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "SELF_BOOKING_COUNT", operator: "GREATER_THAN", value: "10" }],
        weight: 30,
        matchAll: false,
        autoLock: false,
        description: "self-booking abuse",
      },
    ]);
    expect(result.score).toBe(30);
  });

  it("does not match GREATER_THAN when value is below threshold", () => {
    const metrics = makeMetrics({ selfBookingCount: 5 });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "SELF_BOOKING_COUNT", operator: "GREATER_THAN", value: "10" }],
        weight: 30,
        matchAll: false,
        autoLock: false,
        description: "self-booking abuse",
      },
    ]);
    expect(result.score).toBe(0);
  });

  it("matches MATCHES_DOMAIN on domain fields", () => {
    const metrics = makeMetrics({ signupEmailDomain: "spam.com" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "SIGNUP_EMAIL_DOMAIN", operator: "MATCHES_DOMAIN", value: "spam.com" }],
        weight: 40,
        matchAll: false,
        autoLock: false,
        description: "spam domain",
      },
    ]);
    expect(result.score).toBe(40);
  });

  it("matches wildcard domain patterns", () => {
    const metrics = makeMetrics({ signupEmailDomain: "sub.spam.com" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "SIGNUP_EMAIL_DOMAIN", operator: "MATCHES_DOMAIN", value: "*.spam.com" }],
        weight: 40,
        matchAll: false,
        autoLock: false,
        description: "spam subdomain",
      },
    ]);
    expect(result.score).toBe(40);
  });

  it("matches GREATER_THAN on velocity fields", () => {
    const metrics = makeMetrics({ bookingVelocity: { hour: 60, min: 5 } });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "50/hour" }],
        weight: 25,
        matchAll: false,
        autoLock: false,
        description: "high velocity",
      },
    ]);
    expect(result.score).toBe(25);
  });

  it("does not match velocity when below threshold", () => {
    const metrics = makeMetrics({ bookingVelocity: { hour: 10, min: 2 } });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "BOOKING_VELOCITY", operator: "GREATER_THAN", value: "50/hour" }],
        weight: 25,
        matchAll: false,
        autoLock: false,
        description: "high velocity",
      },
    ]);
    expect(result.score).toBe(0);
  });

  it("requires all conditions when matchAll is true", () => {
    const metrics = makeMetrics({ username: "spammer", signupEmailDomain: "spam.com" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [
          { field: "USERNAME", operator: "EXACT", value: "spammer" },
          { field: "SIGNUP_EMAIL_DOMAIN", operator: "EXACT", value: "spam.com" },
        ],
        weight: 50,
        matchAll: true,
        autoLock: false,
        description: "combined match",
      },
    ]);
    expect(result.score).toBe(50);
  });

  it("fails matchAll when one condition doesn't match", () => {
    const metrics = makeMetrics({ username: "spammer", signupEmailDomain: "legit.com" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [
          { field: "USERNAME", operator: "EXACT", value: "spammer" },
          { field: "SIGNUP_EMAIL_DOMAIN", operator: "EXACT", value: "spam.com" },
        ],
        weight: 50,
        matchAll: true,
        autoLock: false,
        description: "combined match",
      },
    ]);
    expect(result.score).toBe(0);
  });

  it("sets shouldAutoLock when autoLock rule matches", () => {
    const metrics = makeMetrics({ username: "badactor" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "USERNAME", operator: "EXACT", value: "badactor" }],
        weight: 100,
        matchAll: false,
        autoLock: true,
        description: "auto lock",
      },
    ]);
    expect(result.shouldAutoLock).toBe(true);
    expect(result.autoLockRule).toEqual({ groupId: "rule-1", description: "auto lock" });
  });

  it("caps score at 100", () => {
    const metrics = makeMetrics({ eventTypeTitles: ["spam"], username: "spammer" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "spam" }],
        weight: 60,
        matchAll: false,
        autoLock: false,
        description: "spam title",
      },
      {
        id: "rule-2",
        conditions: [{ field: "USERNAME", operator: "EXACT", value: "spammer" }],
        weight: 60,
        matchAll: false,
        autoLock: false,
        description: "spammer name",
      },
    ]);
    expect(result.score).toBe(100);
    expect(result.matchedRules).toHaveLength(2);
  });

  it("sums weights from multiple matched rules", () => {
    const metrics = makeMetrics({ eventTypeTitles: ["spam"], username: "spammer" });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "spam" }],
        weight: 10,
        matchAll: false,
        autoLock: false,
        description: "spam title",
      },
      {
        id: "rule-2",
        conditions: [{ field: "USERNAME", operator: "EXACT", value: "spammer" }],
        weight: 20,
        matchAll: false,
        autoLock: false,
        description: "spammer name",
      },
    ]);
    expect(result.score).toBe(30);
  });

  it("is case insensitive for CONTAINS", () => {
    const metrics = makeMetrics({ eventTypeTitles: ["free bitcoin"] });
    const result = evaluateRules(metrics, [
      {
        id: "rule-1",
        conditions: [{ field: "EVENT_TYPE_TITLE", operator: "CONTAINS", value: "BITCOIN" }],
        weight: 20,
        matchAll: false,
        autoLock: false,
        description: "crypto spam",
      },
    ]);
    expect(result.score).toBe(20);
  });
});
