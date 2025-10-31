import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { getReplyToEmail } from "./getReplyToEmail";
import { getReplyToHeader } from "./getReplyToHeader";

describe("getReplyToEmail", () => {
  it("returns the customReplyToEmail if it is set", () => {
    const calEvent = {
      customReplyToEmail: "customReplyToEmail@example.com",
      organizer: {
        name: "Organizer",
        email: "organizer@example.com",
        timeZone: "UTC",
        language: {
          locale: "en",
          translate: ((key: string) => key) as TFunction,
        },
      },
    };
    expect(getReplyToEmail(calEvent)).toBe("customReplyToEmail@example.com");
  });
  it("returns the organizer's email if customReplyToEmail is not set", () => {
    const calEvent = {
      customReplyToEmail: null,
      organizer: {
        name: "Organizer",
        email: "organizer@example.com",
        timeZone: "UTC",
        language: {
          locale: "en",
          translate: ((key: string) => key) as TFunction,
        },
      },
    };
    expect(getReplyToEmail(calEvent)).toBe("organizer@example.com");
  });
});

describe("getReplyToHeader", () => {
  const createMockCalEvent = (overrides?: Partial<CalendarEvent>): CalendarEvent => ({
    type: "Test Event",
    title: "Test Event",
    description: "",
    startTime: "2024-01-01T10:00:00Z",
    endTime: "2024-01-01T11:00:00Z",
    organizer: {
      name: "Organizer",
      email: "organizer@example.com",
      timeZone: "UTC",
      language: {
        locale: "en",
        translate: ((key: string) => key) as TFunction,
      },
    },
    attendees: [],
    location: "",
    customReplyToEmail: null,
    hideOrganizerEmail: false,
    ...overrides,
  });

  it("returns customReplyToEmail even when hideOrganizerEmail is true (issue #21540)", () => {
    const calEvent = createMockCalEvent({
      hideOrganizerEmail: true,
      customReplyToEmail: "custom@example.com",
    });
    const result = getReplyToHeader(calEvent);
    expect(result).toEqual({ replyTo: "custom@example.com" });
  });

  it("returns empty object when hideOrganizerEmail is true and no customReplyToEmail", () => {
    const calEvent = createMockCalEvent({ hideOrganizerEmail: true });
    const result = getReplyToHeader(calEvent);
    expect(result).toEqual({});
  });
});
