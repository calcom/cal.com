import dayjs from "@calcom/dayjs";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttendeeInBookingInfo, BookingInfo } from "../types";

const mockShortenMany = vi.fn();
vi.mock("@calcom/features/url-shortener", () => ({
  UrlShortenerFactory: {
    create: () => ({
      shortenMany: (...args: unknown[]) => mockShortenMany(...args),
    }),
  },
}));

vi.mock("@calcom/lib/constants", () => ({
  DUB_SMS_DOMAIN: "sms.example.com",
  DUB_SMS_FOLDER_ID: "folder-123",
  WEBSITE_URL: "https://app.cal.com",
}));

const mockCustomTemplate = vi.fn().mockReturnValue({ text: "Final SMS text", html: "<p>Final SMS text</p>" });
const mockTransformResponses = vi.fn((responses) => responses);
vi.mock("./templates/customTemplate", () => ({
  default: (...args: unknown[]) => mockCustomTemplate(...args),
  transformBookingResponsesToVariableFormat: (...args: unknown[]) => mockTransformResponses(...args),
}));

const mockGetWorkflowRecipientEmail = vi.fn();
vi.mock("../../getWorkflowReminders", () => ({
  getWorkflowRecipientEmail: (...args: unknown[]) => mockGetWorkflowRecipientEmail(...args),
}));

import { getAttendeeToBeUsedInSMS, getSMSMessageWithVariables, shouldUseTwilio } from "./utils";

function buildMockAttendee(overrides: Partial<AttendeeInBookingInfo> = {}): AttendeeInBookingInfo {
  return {
    name: "Test Attendee",
    firstName: "Test",
    lastName: "Attendee",
    email: "attendee@example.com",
    phoneNumber: "+15551234567",
    timeZone: "America/New_York",
    language: { locale: "en" },
    ...overrides,
  };
}

function buildMockBookingInfo(overrides: Partial<BookingInfo> = {}): BookingInfo {
  return {
    uid: "booking-uid-123",
    bookerUrl: "https://cal.example.com",
    attendees: [buildMockAttendee()],
    organizer: {
      language: { locale: "en" },
      name: "Test Organizer",
      email: "organizer@example.com",
      timeZone: "Europe/London",
      timeFormat: "HH:mm" as BookingInfo["organizer"]["timeFormat"],
      username: "organizer",
    },
    eventType: {
      slug: "test-event",
    },
    startTime: "2025-06-15T10:00:00Z",
    endTime: "2025-06-15T11:00:00Z",
    title: "Test Event",
    location: "https://meet.google.com/test",
    additionalNotes: "Some notes",
    responses: null,
    metadata: { videoCallUrl: "https://meet.google.com/abc" },
    cancellationReason: null,
    rescheduleReason: null,
    ...overrides,
  };
}

describe("utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShortenMany.mockResolvedValue([
      { shortLink: "https://short.link/meet" },
      { shortLink: "https://short.link/cancel" },
      { shortLink: "https://short.link/reschedule" },
    ]);
    mockCustomTemplate.mockReturnValue({ text: "Final SMS text", html: "<p>Final SMS text</p>" });
    mockGetWorkflowRecipientEmail.mockReturnValue("attendee@example.com");
  });

  describe("getSMSMessageWithVariables", () => {
    describe("URL construction", () => {
      it("builds meetingUrl from metadata videoCallUrl", async () => {
        const evt = buildMockBookingInfo({ metadata: { videoCallUrl: "https://meet.google.com/abc" } });
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        const urls = mockShortenMany.mock.calls[0][0];
        expect(urls[0]).toBe("https://meet.google.com/abc");
      });

      it("uses empty string for meetingUrl when no videoCallUrl in metadata", async () => {
        const evt = buildMockBookingInfo({ metadata: {} });
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        const urls = mockShortenMany.mock.calls[0][0];
        expect(urls[0]).toBe("");
      });

      it("builds cancelLink with cancelledBy param for attendee actions", async () => {
        mockGetWorkflowRecipientEmail.mockReturnValue("attendee@example.com");
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        const urls = mockShortenMany.mock.calls[0][0];
        expect(urls[1]).toBe(
          "https://cal.example.com/booking/booking-uid-123?cancel=true&cancelledBy=attendee@example.com"
        );
      });

      it("builds cancelLink without cancelledBy when recipientEmail is null", async () => {
        mockGetWorkflowRecipientEmail.mockReturnValue(null);
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_NUMBER);

        const urls = mockShortenMany.mock.calls[0][0];
        expect(urls[1]).toBe("https://cal.example.com/booking/booking-uid-123?cancel=true");
      });

      it("builds rescheduleLink with rescheduledBy param", async () => {
        mockGetWorkflowRecipientEmail.mockReturnValue("attendee@example.com");
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        const urls = mockShortenMany.mock.calls[0][0];
        expect(urls[2]).toBe(
          "https://cal.example.com/reschedule/booking-uid-123?rescheduledBy=attendee@example.com"
        );
      });

      it("builds rescheduleLink without rescheduledBy when recipientEmail is null", async () => {
        mockGetWorkflowRecipientEmail.mockReturnValue(null);
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_NUMBER);

        const urls = mockShortenMany.mock.calls[0][0];
        expect(urls[2]).toBe("https://cal.example.com/reschedule/booking-uid-123");
      });

      it("falls back to WEBSITE_URL when bookerUrl is nullish", async () => {
        const evt = buildMockBookingInfo({ bookerUrl: undefined as unknown as string });
        const attendee = buildMockAttendee();
        mockGetWorkflowRecipientEmail.mockReturnValue(null);

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_NUMBER);

        const urls = mockShortenMany.mock.calls[0][0];
        expect(urls[1]).toContain("https://app.cal.com/booking/");
        expect(urls[2]).toContain("https://app.cal.com/reschedule/");
      });
    });

    describe("URL shortening", () => {
      it("calls shortenMany with all three URLs", async () => {
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        expect(mockShortenMany).toHaveBeenCalledTimes(1);
        expect(mockShortenMany.mock.calls[0][0]).toHaveLength(3);
      });

      it("always passes domain and folderId options", async () => {
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        expect(mockShortenMany.mock.calls[0][1]).toEqual({
          domain: "sms.example.com",
          folderId: "folder-123",
        });
      });

      it("uses shortened URLs in the variables passed to customTemplate", async () => {
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        const variables = mockCustomTemplate.mock.calls[0][1];
        expect(variables.meetingUrl).toBe("https://short.link/meet");
        expect(variables.cancelLink).toBe("https://short.link/cancel");
        expect(variables.rescheduleLink).toBe("https://short.link/reschedule");
      });
    });

    describe("timezone selection", () => {
      it("uses attendee timezone for SMS_ATTENDEE action", async () => {
        const attendee = buildMockAttendee({ timeZone: "America/New_York" });
        const evt = buildMockBookingInfo({
          organizer: {
            language: { locale: "en" },
            name: "Org",
            email: "org@test.com",
            timeZone: "Europe/London",
          },
        });

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        const variables = mockCustomTemplate.mock.calls[0][1];
        expect(variables.timeZone).toBe("America/New_York");
      });

      it("uses organizer timezone for SMS_NUMBER action", async () => {
        const attendee = buildMockAttendee({ timeZone: "America/New_York" });
        const evt = buildMockBookingInfo({
          organizer: {
            language: { locale: "en" },
            name: "Org",
            email: "org@test.com",
            timeZone: "Europe/London",
          },
        });

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_NUMBER);

        const variables = mockCustomTemplate.mock.calls[0][1];
        expect(variables.timeZone).toBe("Europe/London");
      });
    });

    describe("variable assembly", () => {
      it("includes all expected variable fields", async () => {
        const evt = buildMockBookingInfo({
          cancellationReason: "Too busy",
          rescheduleReason: "Conflict",
        });
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        const variables = mockCustomTemplate.mock.calls[0][1];
        expect(variables).toMatchObject({
          eventName: "Test Event",
          organizerName: "Test Organizer",
          attendeeName: "Test Attendee",
          attendeeFirstName: "Test",
          attendeeLastName: "Attendee",
          attendeeEmail: "attendee@example.com",
          location: "https://meet.google.com/test",
          additionalNotes: "Some notes",
          meetingUrl: "https://short.link/meet",
          cancelLink: "https://short.link/cancel",
          rescheduleLink: "https://short.link/reschedule",
          cancelReason: "Too busy",
          rescheduleReason: "Conflict",
        });
        expect(variables.eventDate).toBeDefined();
        expect(variables.eventEndTime).toBeDefined();
        expect(variables.timeZone).toBeDefined();
        expect(variables.attendeeTimezone).toBeDefined();
        expect(variables.eventTimeInAttendeeTimezone).toBeDefined();
        expect(variables.eventEndTimeInAttendeeTimezone).toBeDefined();
      });

      it("attendeeTimezone always uses evt.attendees[0].timeZone", async () => {
        const evt = buildMockBookingInfo({
          attendees: [buildMockAttendee({ timeZone: "Asia/Tokyo" })],
        });
        const differentAttendee = buildMockAttendee({ timeZone: "US/Pacific" });

        await getSMSMessageWithVariables("Hello", evt, differentAttendee, WorkflowActions.SMS_NUMBER);

        const variables = mockCustomTemplate.mock.calls[0][1];
        expect(variables.attendeeTimezone).toBe("Asia/Tokyo");
      });
    });

    describe("locale and template rendering", () => {
      it("uses attendee locale for SMS_ATTENDEE action", async () => {
        const attendee = buildMockAttendee();
        attendee.language = { locale: "fr" };
        const evt = buildMockBookingInfo();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        expect(mockCustomTemplate.mock.calls[0][2]).toBe("fr");
      });

      it("uses organizer locale for non-attendee action", async () => {
        const attendee = buildMockAttendee();
        attendee.language = { locale: "fr" };
        const evt = buildMockBookingInfo({
          organizer: {
            language: { locale: "de" },
            name: "Org",
            email: "org@test.com",
            timeZone: "Europe/Berlin",
          },
        });

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_NUMBER);

        expect(mockCustomTemplate.mock.calls[0][2]).toBe("de");
      });

      it("passes organizer timeFormat to customTemplate", async () => {
        const evt = buildMockBookingInfo({
          organizer: {
            language: { locale: "en" },
            name: "Org",
            email: "org@test.com",
            timeZone: "UTC",
            timeFormat: "HH:mm" as BookingInfo["organizer"]["timeFormat"],
          },
        });
        const attendee = buildMockAttendee();

        await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_NUMBER);

        expect(mockCustomTemplate.mock.calls[0][3]).toBe("HH:mm");
      });

      it("returns the text property from customTemplate result", async () => {
        mockCustomTemplate.mockReturnValue({ text: "Your booking is confirmed", html: "" });
        const evt = buildMockBookingInfo();
        const attendee = buildMockAttendee();

        const result = await getSMSMessageWithVariables("Hello", evt, attendee, WorkflowActions.SMS_ATTENDEE);

        expect(result).toBe("Your booking is confirmed");
      });
    });
  });

  describe("getAttendeeToBeUsedInSMS", () => {
    describe("SMS_ATTENDEE action", () => {
      it("returns attendee matching responses email when reminderPhone is truthy", () => {
        const matchingAttendee = buildMockAttendee({ email: "match@example.com", name: "Match" });
        const firstAttendee = buildMockAttendee({ email: "first@example.com", name: "First" });
        const evt = buildMockBookingInfo({
          attendees: [firstAttendee, matchingAttendee],
          responses: { email: { value: "match@example.com", label: "Email" } },
        });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.SMS_ATTENDEE, evt, "+15551234567");

        expect(result.name).toBe("Match");
      });

      it("falls back to first attendee when no attendee matches email", () => {
        const firstAttendee = buildMockAttendee({ email: "first@example.com", name: "First" });
        const evt = buildMockBookingInfo({
          attendees: [firstAttendee],
          responses: { email: { value: "nomatch@example.com", label: "Email" } },
        });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.SMS_ATTENDEE, evt, "+15551234567");

        expect(result.name).toBe("First");
      });

      it("falls back to first attendee when reminderPhone is null", () => {
        const firstAttendee = buildMockAttendee({ email: "first@example.com", name: "First" });
        const matchAttendee = buildMockAttendee({ email: "match@example.com", name: "Match" });
        const evt = buildMockBookingInfo({
          attendees: [firstAttendee, matchAttendee],
          responses: { email: { value: "match@example.com", label: "Email" } },
        });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.SMS_ATTENDEE, evt, null);

        expect(result.name).toBe("First");
      });

      it("falls back to first attendee when reminderPhone is empty string", () => {
        const firstAttendee = buildMockAttendee({ email: "first@example.com", name: "First" });
        const evt = buildMockBookingInfo({
          attendees: [firstAttendee],
          responses: { email: { value: "first@example.com", label: "Email" } },
        });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.SMS_ATTENDEE, evt, "");

        expect(result.name).toBe("First");
      });

      it("falls back to first attendee when responses is null", () => {
        const firstAttendee = buildMockAttendee({ name: "First" });
        const evt = buildMockBookingInfo({
          attendees: [firstAttendee],
          responses: null,
        });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.SMS_ATTENDEE, evt, "+15551234567");

        expect(result.name).toBe("First");
      });
    });

    describe("non-attendee actions", () => {
      it("returns first attendee for SMS_NUMBER action", () => {
        const firstAttendee = buildMockAttendee({ name: "First" });
        const secondAttendee = buildMockAttendee({ name: "Second" });
        const evt = buildMockBookingInfo({ attendees: [firstAttendee, secondAttendee] });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.SMS_NUMBER, evt, "+15551234567");

        expect(result.name).toBe("First");
      });

      it("returns first attendee for EMAIL_HOST action", () => {
        const firstAttendee = buildMockAttendee({ name: "First" });
        const evt = buildMockBookingInfo({ attendees: [firstAttendee] });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.EMAIL_HOST, evt, null);

        expect(result.name).toBe("First");
      });

      it("returns first attendee for WHATSAPP_NUMBER action", () => {
        const firstAttendee = buildMockAttendee({ name: "First" });
        const evt = buildMockBookingInfo({ attendees: [firstAttendee] });

        const result = getAttendeeToBeUsedInSMS(WorkflowActions.WHATSAPP_NUMBER, evt, "+15551234567");

        expect(result.name).toBe("First");
      });
    });
  });

  describe("shouldUseTwilio", () => {
    describe("immediate trigger events", () => {
      const immediateEvents = [
        WorkflowTriggerEvents.NEW_EVENT,
        WorkflowTriggerEvents.EVENT_CANCELLED,
        WorkflowTriggerEvents.RESCHEDULE_EVENT,
        WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED,
        WorkflowTriggerEvents.BOOKING_PAID,
        WorkflowTriggerEvents.BOOKING_PAYMENT_INITIATED,
        WorkflowTriggerEvents.BOOKING_REJECTED,
        WorkflowTriggerEvents.BOOKING_REQUESTED,
        WorkflowTriggerEvents.FORM_SUBMITTED,
        WorkflowTriggerEvents.FORM_SUBMITTED_NO_EVENT,
      ];

      immediateEvents.forEach((trigger) => {
        it(`returns true for ${trigger}`, () => {
          expect(shouldUseTwilio(trigger, null)).toBe(true);
        });
      });

      it("returns true for immediate triggers regardless of scheduledDate", () => {
        expect(shouldUseTwilio(WorkflowTriggerEvents.NEW_EVENT, dayjs().add(5, "hour"))).toBe(true);
      });
    });

    describe("BEFORE_EVENT / AFTER_EVENT", () => {
      it("returns true when scheduledDate is 30min from now", () => {
        const scheduledDate = dayjs().add(30, "minute");
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, scheduledDate)).toBe(true);
      });

      it("returns true when scheduledDate is 1hr from now", () => {
        const scheduledDate = dayjs().add(1, "hour");
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, scheduledDate)).toBe(true);
      });

      it("returns false when scheduledDate is null", () => {
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, null)).toBe(false);
      });

      it("returns false when scheduledDate is 10min from now (too close)", () => {
        const scheduledDate = dayjs().add(10, "minute");
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, scheduledDate)).toBe(false);
      });

      it("returns false when scheduledDate is 3hr from now (beyond 2hr window)", () => {
        const scheduledDate = dayjs().add(3, "hour");
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, scheduledDate)).toBe(false);
      });

      it("returns false at exactly 15min boundary", () => {
        const scheduledDate = dayjs().add(15, "minute");
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, scheduledDate)).toBe(false);
      });

      it("returns true at 16min from now", () => {
        const scheduledDate = dayjs().add(16, "minute");
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, scheduledDate)).toBe(true);
      });

      it("returns false at 2hr+1min from now", () => {
        const scheduledDate = dayjs().add(2, "hour").add(1, "minute");
        expect(shouldUseTwilio(WorkflowTriggerEvents.BEFORE_EVENT, scheduledDate)).toBe(false);
      });

      it("works the same for AFTER_EVENT trigger", () => {
        const withinWindow = dayjs().add(30, "minute");
        const outsideWindow = dayjs().add(3, "hour");

        expect(shouldUseTwilio(WorkflowTriggerEvents.AFTER_EVENT, withinWindow)).toBe(true);
        expect(shouldUseTwilio(WorkflowTriggerEvents.AFTER_EVENT, outsideWindow)).toBe(false);
      });
    });

    describe("other triggers", () => {
      it("returns false for AFTER_HOSTS_CAL_VIDEO_NO_SHOW", () => {
        expect(
          shouldUseTwilio(WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW, dayjs().add(30, "minute"))
        ).toBe(false);
      });

      it("returns false for AFTER_GUESTS_CAL_VIDEO_NO_SHOW", () => {
        expect(
          shouldUseTwilio(WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW, dayjs().add(30, "minute"))
        ).toBe(false);
      });
    });
  });
});
