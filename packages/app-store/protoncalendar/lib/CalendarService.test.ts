import { describe, expect, it, vi } from "vitest";

vi.mock("tsdav", () => ({
  createAccount: vi.fn(),
  fetchCalendars: vi.fn(),
  fetchCalendarObjects: vi.fn(),
  createCalendarObject: vi.fn(),
  updateCalendarObject: vi.fn(),
  deleteCalendarObject: vi.fn(),
  getBasicAuthHeaders: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn().mockImplementation((text) => {
    if (typeof text === "object") return JSON.stringify(text);
    return text;
  }),
}));

import { metadata } from "../_metadata";
import BuildCalendarService from "./CalendarService";

describe("Proton Calendar app", () => {
  it("exposes consistent metadata", () => {
    expect(metadata.slug).toBe("proton-calendar");
    expect(metadata.dirName).toBe("protoncalendar");
    expect(metadata.type).toBe("proton_calendar");
    expect(metadata.variant).toBe("calendar");
    expect(metadata.categories).toContain("calendar");
    expect(metadata.isOAuth).toBe(false);
  });

  it("builds a calendar service that exposes the standard CalDAV surface", () => {
    const service = BuildCalendarService({
      id: 1,
      type: "proton_calendar",
      delegationCredentialId: null,
      user: { email: "user@proton.me" },
      userId: 1,
      teamId: null,
      appId: "proton-calendar",
      invalid: false,
      encryptedKey: null,
      key: {
        username: "user@proton.me",
        password: "bridge-password",
        url: "http://127.0.0.1:1083",
      },
    });

    expect(typeof service.createEvent).toBe("function");
    expect(typeof service.updateEvent).toBe("function");
    expect(typeof service.deleteEvent).toBe("function");
    expect(typeof service.getAvailability).toBe("function");
    expect(typeof service.listCalendars).toBe("function");
  });
});
