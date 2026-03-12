import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return { ...actual, WEBAPP_URL: "https://app.cal.com" };
});

vi.mock("@calcom/features/abuse-scoring/lib/hooks", () => ({
  onEventTypeChange: vi.fn(),
  onSignup: vi.fn(),
  onBookingCreated: vi.fn(),
}));

import type { AlertPayload } from "../lib/alerts";
import { SlackAbuseAlerter } from "../lib/alerts";

const WEBHOOK_URL = "https://hooks.slack.com/services/test";

describe("SlackAbuseAlerter", () => {
  const mockPayload: AlertPayload = {
    type: "user_locked",
    userId: 42,
    score: 85,
    signals: [
      { type: "redirect_malicious", weight: 30, context: "phishing-cal.com (1 EventType(s))" },
      { type: "high_booking_velocity", weight: 35, context: "52 bookings in peak hour" },
    ],
    reason: "score_threshold",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs instead of sending when webhook URL is not configured", async () => {
    const alerter = new SlackAbuseAlerter(undefined);
    await alerter.send(mockPayload);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends Slack payload when webhook URL is configured", async () => {
    const alerter = new SlackAbuseAlerter(WEBHOOK_URL);
    await alerter.send(mockPayload);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].color).toBe("#dc2626"); // locked = red
  });

  it("uses warning color for non-lock alerts", async () => {
    const alerter = new SlackAbuseAlerter(WEBHOOK_URL);
    await alerter.send({ ...mockPayload, type: "user_suspicious" });

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.attachments[0].color).toBe("#f59e0b"); // warning = amber
  });

  it("includes user ID, score, and signals in payload", async () => {
    const alerter = new SlackAbuseAlerter(WEBHOOK_URL);
    await alerter.send(mockPayload);

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const blocks = body.attachments[0].blocks;

    const fieldsBlock = blocks.find((b: { type: string }) => b.type === "section" && b.fields);
    const fieldTexts = fieldsBlock.fields.map((f: { text: string }) => f.text);
    expect(fieldTexts.some((t: string) => t.includes("settings/admin/users/42/edit"))).toBe(true);
    expect(fieldTexts.some((t: string) => t.includes("85/100"))).toBe(true);

    const signalsBlock = blocks.find(
      (b: { type: string; text?: { text: string } }) =>
        b.type === "section" && b.text?.text?.includes("Signals")
    );
    expect(signalsBlock.text.text).toContain("redirect_malicious");
    expect(signalsBlock.text.text).toContain("high_booking_velocity");
  });

  it("does not throw when fetch fails", async () => {
    const alerter = new SlackAbuseAlerter(WEBHOOK_URL);
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network error"));

    await expect(alerter.send(mockPayload)).resolves.toBeUndefined();
  });
});
