import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
  WEBSITE_URL: "https://cal.com",
  CONSOLE_URL: "https://console.cal.com",
  EMBED_LIB_URL: "https://app.cal.com/embed/lib/embed.js",
}));

import type { CalendarEvent } from "@calcom/types/Calendar";

import {
  getWhat,
  getWhen,
  getWho,
  getAdditionalNotes,
  getAppsStatus,
  getDescription,
  getLocation,
  getProviderName,
  getUid,
  getCancelLink,
  getRescheduleLink,
  getCancellationReason,
  isDailyVideoCall,
  getVideoCallPassword,
  getVideoCallUrlFromCalEvent,
  getPublicVideoCallUrl,
  getManageLink,
  getBookingUrl,
  getRichDescription,
} from "./CalEventParser";

describe("getRichDescription", () => {
  const t = ((key: string, _args?: Record<string, unknown>) => key) as TFunction;

  const mockCalEvent: CalendarEvent = {
    type: "test",
    title: "Test Event",
    description: "Test description",
    startTime: "2023-01-01T10:00:00Z",
    endTime: "2023-01-01T11:00:00Z",
    organizer: {
      email: "test@example.com",
      name: "Test Organizer",
      timeZone: "America/New_York",
      language: { translate: t, locale: "en" },
    },
    attendees: [
      {
        email: "attendee@example.com",
        name: "Test Attendee",
        timeZone: "America/New_York",
        language: { translate: t, locale: "en" },
      },
    ],
    location: "https://zoom.us/j/123456brahhh",
    additionalNotes: "Some additional notes",
  };

  it("should format description without extra whitespace", () => {
    const description = getRichDescription(mockCalEvent, t);

    console.log("Description:", description);
    console.log(
      "Lines:",
      description.split("\n").map((line) => `"${line}"`)
    );

    // Description should not have more than 2 consecutive newlines
    expect(description).not.toMatch(/\n{3,}/);

    // Each non-empty line should have content
    const lines = description.split("\n").filter((line) => line.trim());
    lines.forEach((line) => {
      expect(line.trim().length).toBeGreaterThan(0);
    });

    // Verify content is present and properly formatted
    expect(description).toContain("what:");
    expect(description).toContain("Test Event");
    expect(description).toContain("where:");
    expect(description).toContain("https://zoom.us/j/123456brahhh");
  });

  it("should include payment info when present", () => {
    const eventWithPayment = {
      ...mockCalEvent,
      paymentInfo: {
        link: "https://payment.test",
      },
    };

    const description = getRichDescription(eventWithPayment, t);
    expect(description).toContain("pay_now:\nhttps://payment.test");
  });

  it("should handle empty optional fields", () => {
    const eventWithoutOptionals = {
      ...mockCalEvent,
      description: "",
      additionalNotes: "",
      location: "",
    };

    const description = getRichDescription(eventWithoutOptionals, t);
    expect(description).not.toContain("description:");
    expect(description).not.toContain("additional_notes:");
    // Should still contain required fields
    expect(description).toContain("what:");
    expect(description).toContain("who:");
  });
});

describe("getWhat", () => {
  const t = ((key: string) => key) as TFunction;

  it("returns formatted what string", () => {
    expect(getWhat("Team Meeting", t)).toBe("what:\nTeam Meeting");
  });
});

describe("getWhen", () => {
  const t = ((key: string) => key) as TFunction;

  it("returns invitee timezone for non-seated events", () => {
    const result = getWhen(
      {
        organizer: {
          email: "org@example.com",
          name: "Organizer",
          timeZone: "America/New_York",
          language: { translate: t, locale: "en" },
        },
        attendees: [
          {
            email: "att@example.com",
            name: "Attendee",
            timeZone: "Europe/London",
            language: { translate: t, locale: "en" },
          },
        ],
      },
      t
    );
    expect(result).toContain("invitee_timezone");
    expect(result).toContain("Europe/London");
  });

  it("returns organizer timezone for seated events", () => {
    const result = getWhen(
      {
        organizer: {
          email: "org@example.com",
          name: "Organizer",
          timeZone: "America/New_York",
          language: { translate: t, locale: "en" },
        },
        attendees: [],
        seatsPerTimeSlot: 5,
      },
      t
    );
    expect(result).toContain("organizer_timezone");
    expect(result).toContain("America/New_York");
  });

  it("falls back to organizer timezone when no attendees", () => {
    const result = getWhen(
      {
        organizer: {
          email: "org@example.com",
          name: "Organizer",
          timeZone: "America/New_York",
          language: { translate: t, locale: "en" },
        },
        attendees: [],
      },
      t
    );
    expect(result).toContain("America/New_York");
  });
});

describe("getWho", () => {
  const t = ((key: string) => key) as TFunction;
  const organizer = {
    email: "org@example.com",
    name: "Organizer",
    timeZone: "UTC",
    language: { translate: t, locale: "en" },
  };

  it("includes organizer and attendees", () => {
    const result = getWho(
      {
        attendees: [
          {
            email: "att@example.com",
            name: "Attendee",
            timeZone: "UTC",
            language: { translate: t, locale: "en" },
          },
        ],
        organizer,
      },
      t
    );
    expect(result).toContain("Organizer");
    expect(result).toContain("Attendee");
    expect(result).toContain("att@example.com");
  });

  it("hides organizer email when hideOrganizerEmail is true", () => {
    const result = getWho(
      {
        attendees: [],
        organizer,
        hideOrganizerEmail: true,
      },
      t
    );
    expect(result).toContain("Organizer");
    expect(result).not.toContain("org@example.com");
  });

  it("hides attendees for seated events without seatsShowAttendees", () => {
    const result = getWho(
      {
        attendees: [
          {
            email: "att@example.com",
            name: "Attendee",
            timeZone: "UTC",
            language: { translate: t, locale: "en" },
          },
        ],
        organizer,
        seatsPerTimeSlot: 5,
        seatsShowAttendees: false,
      },
      t
    );
    expect(result).not.toContain("Attendee");
    expect(result).not.toContain("att@example.com");
  });

  it("includes team members when present", () => {
    const result = getWho(
      {
        attendees: [],
        organizer,
        team: {
          id: 1,
          members: [{ name: "Team Member", email: "team@example.com" }],
        },
      },
      t
    );
    expect(result).toContain("Team Member");
    expect(result).toContain("team@example.com");
  });
});

describe("getAdditionalNotes", () => {
  const t = ((key: string) => key) as TFunction;

  it("returns empty string when no notes", () => {
    expect(getAdditionalNotes(t)).toBe("");
    expect(getAdditionalNotes(t, null)).toBe("");
    expect(getAdditionalNotes(t, "")).toBe("");
  });

  it("returns formatted notes", () => {
    expect(getAdditionalNotes(t, "Please bring ID")).toBe("additional_notes:\nPlease bring ID");
  });
});

describe("getAppsStatus", () => {
  const t = ((key: string) => key) as TFunction;

  it("returns empty string when no apps status", () => {
    expect(getAppsStatus(t)).toBe("");
    expect(getAppsStatus(t, null)).toBe("");
  });

  it("includes app name and success count", () => {
    const result = getAppsStatus(t, [
      { appName: "Google Calendar", type: "calendar", success: 1, failures: 0, errors: [] },
    ]);
    expect(result).toContain("Google Calendar");
    expect(result).toContain("\u2705");
  });

  it("includes failure info", () => {
    const result = getAppsStatus(t, [
      { appName: "Zoom", type: "video", success: 0, failures: 1, errors: ["Connection failed"] },
    ]);
    expect(result).toContain("Zoom");
    expect(result).toContain("\u274C");
    expect(result).toContain("Connection failed");
  });
});

describe("getDescription", () => {
  const t = ((key: string) => key) as TFunction;

  it("returns empty string when no description", () => {
    expect(getDescription(t)).toBe("");
    expect(getDescription(t, null)).toBe("");
    expect(getDescription(t, "")).toBe("");
  });

  it("converts HTML to plain text", () => {
    const result = getDescription(t, "<p>Hello <strong>world</strong></p>");
    expect(result).toContain("description");
    expect(result).toContain("Hello world");
    expect(result).not.toContain("<p>");
  });

  it("converts links to readable format", () => {
    const result = getDescription(t, '<a href="https://example.com">Click here</a>');
    expect(result).toContain("Click here");
    expect(result).toContain("https://example.com");
  });
});

describe("getLocation", () => {
  it("returns meeting URL from video call data", () => {
    const result = getLocation({
      videoCallData: { type: "zoom_video", url: "https://zoom.us/j/123" },
    });
    expect(result).toBe("https://zoom.us/j/123");
  });

  it("returns provider name for integration locations", () => {
    const result = getLocation({ location: "integrations:zoom" });
    expect(result).toBe("Zoom");
  });

  it("returns location string as fallback", () => {
    const result = getLocation({ location: "Conference Room A" });
    expect(result).toBe("Conference Room A");
  });

  it("returns empty string when no location", () => {
    const result = getLocation({});
    expect(result).toBe("");
  });
});

describe("getProviderName", () => {
  it("extracts provider name from integration string", () => {
    expect(getProviderName("integrations:zoom")).toBe("Zoom");
    expect(getProviderName("integrations:google_calendar")).toBe("Google_calendar");
  });

  it("returns 'Cal Video' for daily integration", () => {
    expect(getProviderName("integrations:daily")).toBe("Cal Video");
  });

  it("returns URL for HTTP locations", () => {
    expect(getProviderName("https://meet.example.com/room")).toBe("https://meet.example.com/room");
  });

  it("returns empty string for non-integration locations", () => {
    expect(getProviderName("Conference Room")).toBe("");
    expect(getProviderName(null)).toBe("");
    expect(getProviderName(undefined)).toBe("");
  });
});

describe("getUid", () => {
  it("returns provided uid", () => {
    expect(getUid("my-uid-123")).toBe("my-uid-123");
  });

  it("generates a new uid when none provided", () => {
    const uid = getUid();
    expect(uid).toBeDefined();
    expect(uid.length).toBeGreaterThan(0);
  });

  it("generates a new uid for null", () => {
    const uid = getUid(null);
    expect(uid).toBeDefined();
    expect(uid.length).toBeGreaterThan(0);
  });
});

describe("getCancellationReason", () => {
  const t = ((key: string) => key) as TFunction;

  it("returns empty string when no reason", () => {
    expect(getCancellationReason(t)).toBe("");
    expect(getCancellationReason(t, null)).toBe("");
    expect(getCancellationReason(t, "")).toBe("");
  });

  it("strips $RCH$ prefix", () => {
    const result = getCancellationReason(t, "$RCH$Schedule conflict");
    expect(result).toContain("Schedule conflict");
    expect(result).not.toContain("$RCH$");
  });

  it("returns formatted reason without prefix", () => {
    const result = getCancellationReason(t, "I have a conflict");
    expect(result).toBe("cancellation_reason:\nI have a conflict");
  });
});

describe("isDailyVideoCall", () => {
  it("returns true for daily_video type", () => {
    expect(isDailyVideoCall({ type: "daily_video", url: "https://daily.co/room", id: "1" })).toBe(true);
  });

  it("returns false for other types", () => {
    expect(isDailyVideoCall({ type: "zoom_video", url: "https://zoom.us/j/123", id: "1" })).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDailyVideoCall(undefined)).toBe(false);
  });
});

describe("getVideoCallPassword", () => {
  it("returns empty string for daily video", () => {
    expect(getVideoCallPassword({ type: "daily_video", url: "", id: "1" })).toBe("");
  });

  it("returns password for non-daily video", () => {
    expect(getVideoCallPassword({ type: "zoom_video", url: "", id: "1", password: "abc123" })).toBe("abc123");
  });

  it("returns empty string when no password", () => {
    expect(getVideoCallPassword({ type: "zoom_video", url: "", id: "1" })).toBe("");
  });
});

describe("getVideoCallUrlFromCalEvent", () => {
  it("returns public URL for daily_video", () => {
    const result = getVideoCallUrlFromCalEvent({
      videoCallData: { type: "daily_video", url: "https://daily.co/room" },
      uid: "test-uid",
    });
    expect(result).toContain("/video/");
  });

  it("returns video call URL for non-daily types", () => {
    const result = getVideoCallUrlFromCalEvent({
      videoCallData: { type: "zoom_video", url: "https://zoom.us/j/123" },
    });
    expect(result).toBe("https://zoom.us/j/123");
  });

  it("returns hangout link from additional info", () => {
    const result = getVideoCallUrlFromCalEvent({
      additionalInformation: { hangoutLink: "https://meet.google.com/abc" },
    });
    expect(result).toBe("https://meet.google.com/abc");
  });

  it("returns http location as video URL", () => {
    const result = getVideoCallUrlFromCalEvent({
      location: "https://meet.example.com/room",
    });
    expect(result).toBe("https://meet.example.com/room");
  });

  it("returns empty string when no video call info", () => {
    const result = getVideoCallUrlFromCalEvent({});
    expect(result).toBe("");
  });
});

describe("getPublicVideoCallUrl", () => {
  it("generates URL with given uid", () => {
    const result = getPublicVideoCallUrl("test-uid");
    expect(result).toBe("https://app.cal.com/video/test-uid");
  });
});

describe("getBookingUrl", () => {
  const t = ((key: string) => key) as TFunction;

  it("returns standard booking URL", () => {
    const result = getBookingUrl({
      type: "30min",
      uid: "booking-123",
      organizer: {
        email: "org@example.com",
        name: "Org",
        timeZone: "UTC",
        language: { translate: t, locale: "en" },
      },
    });
    expect(result).toContain("/booking/booking-123");
    expect(result).toContain("changes=true");
  });

  it("returns platform booking URL", () => {
    const result = getBookingUrl({
      platformClientId: "client-1",
      platformBookingUrl: "https://platform.example.com/booking",
      type: "30min",
      uid: "booking-123",
      organizer: {
        email: "org@example.com",
        name: "Org",
        username: "org",
        timeZone: "UTC",
        language: { translate: t, locale: "en" },
      },
    });
    expect(result).toContain("platform.example.com");
    expect(result).toContain("slug=30min");
  });
});

describe("getCancelLink", () => {
  const t = ((key: string) => key) as TFunction;
  const organizer = {
    email: "org@example.com",
    name: "Org",
    timeZone: "UTC",
    language: { translate: t, locale: "en" },
  };

  it("returns standard cancel link", () => {
    const result = getCancelLink({
      type: "30min",
      uid: "booking-123",
      organizer,
      bookerUrl: "https://cal.example.com",
    });
    expect(result).toContain("/booking/booking-123");
    expect(result).toContain("cancel=true");
  });

  it("returns platform cancel link", () => {
    const result = getCancelLink({
      platformClientId: "client-1",
      platformCancelUrl: "https://platform.example.com/cancel",
      type: "30min",
      uid: "booking-123",
      organizer,
    });
    expect(result).toContain("platform.example.com");
  });
});

describe("getRescheduleLink", () => {
  const t = ((key: string) => key) as TFunction;
  const organizer = {
    email: "org@example.com",
    name: "Org",
    timeZone: "UTC",
    language: { translate: t, locale: "en" },
  };

  it("returns standard reschedule link", () => {
    const result = getRescheduleLink({
      calEvent: {
        type: "30min",
        uid: "booking-123",
        organizer,
        bookerUrl: "https://cal.example.com",
      },
    });
    expect(result).toContain("/reschedule/booking-123");
  });

  it("returns platform reschedule link", () => {
    const result = getRescheduleLink({
      calEvent: {
        platformClientId: "client-1",
        platformRescheduleUrl: "https://platform.example.com/reschedule",
        type: "30min",
        uid: "booking-123",
        organizer,
      },
    });
    expect(result).toContain("platform.example.com");
  });
});

describe("getManageLink", () => {
  const t = ((key: string) => key) as TFunction;
  const organizer = {
    email: "org@example.com",
    name: "Org",
    timeZone: "UTC",
    language: { translate: t, locale: "en" },
  };

  it("returns standard manage link", () => {
    const result = getManageLink(
      {
        type: "30min",
        uid: "booking-123",
        organizer,
        bookerUrl: "https://cal.example.com",
      },
      t
    );
    expect(result).toContain("need_to_reschedule_or_cancel");
    expect(result).toContain("/booking/booking-123");
  });
});
