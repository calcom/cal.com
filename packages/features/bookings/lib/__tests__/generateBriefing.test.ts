import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: messagesCreate };
  },
}));

import { type BriefingInput, generateBriefing } from "../generateBriefing";

const baseInput: BriefingInput = {
  organizerName: "Host",
  organizerEmail: "host@example.com",
  attendeeName: "Guest User",
  attendeeEmail: "guest@example.com",
  eventTitle: "Strategy call",
  startTime: new Date("2026-06-01T15:00:00.000Z"),
  responses: { notes: { label: "Notes", value: "Hello" } },
  timeZone: "America/New_York",
};

describe("generateBriefing", () => {
  beforeEach(() => {
    messagesCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = "sk-test";
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns null when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateBriefing(baseInput)).resolves.toBeNull();
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("returns null when Anthropic API call throws", async () => {
    messagesCreate.mockRejectedValue(new Error("network error"));
    await expect(generateBriefing(baseInput)).resolves.toBeNull();
  });

  it("returns null when response is not valid JSON", async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: "not valid json at all" }],
    });
    await expect(generateBriefing(baseInput)).resolves.toBeNull();
  });

  it("returns BriefingOutput when API call succeeds", async () => {
    const brief = {
      attendeeSummary: "Summary text",
      suggestedAgenda: ["One", "Two", "Three"],
      openingQuestion: "What brings you here?",
      prepTip: "Review the deck.",
    };
    messagesCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(brief) }],
    });
    await expect(generateBriefing(baseInput)).resolves.toEqual(brief);
  });
});
