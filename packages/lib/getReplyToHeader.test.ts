import { describe, expect, it, vi } from "vitest";

vi.mock("./getReplyToEmail", () => ({
  getReplyToEmail: vi.fn(),
}));

import { getReplyToEmail } from "./getReplyToEmail";
import { getReplyToHeader } from "./getReplyToHeader";

const mockGetReplyToEmail = vi.mocked(getReplyToEmail);

const makeCalEvent = (overrides = {}) =>
  ({
    organizer: {
      email: "organizer@example.com",
      name: "Organizer",
      timeZone: "UTC",
      language: { locale: "en" },
    },
    hideOrganizerEmail: false,
    ...overrides,
  }) as Parameters<typeof getReplyToHeader>[0];

describe("getReplyToHeader", () => {
  it("returns empty object when no emails available", () => {
    mockGetReplyToEmail.mockReturnValue(null);
    const result = getReplyToHeader(makeCalEvent());

    expect(result).toEqual({});
  });

  it("returns single replyTo string when only replyToEmail exists", () => {
    mockGetReplyToEmail.mockReturnValue("reply@example.com");
    const result = getReplyToHeader(makeCalEvent());

    expect(result).toEqual({ replyTo: "reply@example.com" });
  });

  it("returns single replyTo string when only one additional email (string)", () => {
    mockGetReplyToEmail.mockReturnValue(null);
    const result = getReplyToHeader(makeCalEvent(), "extra@example.com");

    expect(result).toEqual({ replyTo: "extra@example.com" });
  });

  it("returns array when multiple emails from additionalEmails array", () => {
    mockGetReplyToEmail.mockReturnValue(null);
    const result = getReplyToHeader(makeCalEvent(), ["a@example.com", "b@example.com"]);

    expect(result).toEqual({ replyTo: ["a@example.com", "b@example.com"] });
  });

  it("returns array when additional email string + replyToEmail both exist", () => {
    mockGetReplyToEmail.mockReturnValue("reply@example.com");
    const result = getReplyToHeader(makeCalEvent(), "extra@example.com");

    expect(result).toEqual({ replyTo: ["extra@example.com", "reply@example.com"] });
  });

  it("returns array when additional email array + replyToEmail both exist", () => {
    mockGetReplyToEmail.mockReturnValue("reply@example.com");
    const result = getReplyToHeader(makeCalEvent(), ["a@example.com"]);

    expect(result).toEqual({ replyTo: ["a@example.com", "reply@example.com"] });
  });

  it("passes excludeOrganizerEmail parameter to getReplyToEmail", () => {
    mockGetReplyToEmail.mockReturnValue(null);
    getReplyToHeader(makeCalEvent(), undefined, true);

    expect(mockGetReplyToEmail).toHaveBeenCalledWith(expect.anything(), true);
  });

  it("uses calEvent.hideOrganizerEmail as fallback for excludeOrganizerEmail", () => {
    mockGetReplyToEmail.mockReturnValue(null);
    getReplyToHeader(makeCalEvent({ hideOrganizerEmail: true }));

    expect(mockGetReplyToEmail).toHaveBeenCalledWith(expect.anything(), true);
  });

  it("prefers explicit excludeOrganizerEmail over calEvent.hideOrganizerEmail", () => {
    mockGetReplyToEmail.mockReturnValue(null);
    getReplyToHeader(makeCalEvent({ hideOrganizerEmail: true }), undefined, false);

    expect(mockGetReplyToEmail).toHaveBeenCalledWith(expect.anything(), false);
  });
});
