import { describe, expect, it, vi } from "vitest";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

vi.mock("@calcom/lib/CalEventParser", () => ({
  getRichDescription: vi.fn(() => "mock-description"),
}));

vi.mock("@calcom/lib/getReplyToHeader", () => ({
  getReplyToHeader: vi.fn(() => ({})),
}));

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>mock-email</html>")),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn(() => Promise.resolve((key: string) => key)),
}));

describe("AttendeeScheduledEmail", () => {
  const organizer: Person = {
    id: 1,
    name: "Organizer",
    email: "organizer@example.com",
    timeZone: "Europe/London",
    language: { translate: (key: string) => key, locale: "en" },
    timeFormat: TimeFormat.TWELVE_HOUR,
  };

  const attendee: Person = {
    name: "Attendee",
    email: "attendee@example.com",
    timeZone: "Europe/London",
    language: { translate: (key: string) => key, locale: "en" },
  };

  const calEvent: CalendarEvent = {
    title: "Test Event",
    type: "test-event",
    startTime: "2024-01-01T10:00:00Z",
    endTime: "2024-01-01T11:00:00Z",
    organizer,
    attendees: [attendee],
    bookerUrl: "https://cal.com",
  };

  it("should use organizer's 12h time format if attendee has no preference", () => {
    const email = new AttendeeScheduledEmail(calEvent, attendee);
    const formattedDate = email.getFormattedDate();
    // 10:00am is 12h format
    expect(formattedDate).toContain("10:00am");
    expect(formattedDate).toContain("11:00am");
  });

  it("should use attendee's 24h time format preference", () => {
    const attendeeWith24h = { ...attendee, timeFormat: TimeFormat.TWENTY_FOUR_HOUR };
    const email = new AttendeeScheduledEmail(calEvent, attendeeWith24h);
    const formattedDate = email.getFormattedDate();
    // 10:00 is 24h format
    expect(formattedDate).toContain("10:00");
    expect(formattedDate).not.toContain("am");
    expect(formattedDate).toContain("11:00");
  });

  it("should use attendee's 12h time format preference even if organizer uses 24h", () => {
    const organizerWith24h = { ...organizer, timeFormat: TimeFormat.TWENTY_FOUR_HOUR };
    const calEventWith24hOrganizer = { ...calEvent, organizer: organizerWith24h };
    const attendeeWith12h = { ...attendee, timeFormat: TimeFormat.TWELVE_HOUR };
    
    const email = new AttendeeScheduledEmail(calEventWith24hOrganizer, attendeeWith12h);
    const formattedDate = email.getFormattedDate();
    
    expect(formattedDate).toContain("10:00am");
  });
});