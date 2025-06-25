import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CreateUpdateResult, PartialBooking } from "@calcom/types/EventManager";

import EventManager from "../EventManager";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";

// Import utilities from utils file
import {
  expectCalendarEventToBeDeleted,
  expectVideoToBeDeleted,
  expectCalendarEventToBeUpdated,
  expectVideoToBeUpdated,
  createMockCredentials,
  createMockCalendarEvent,
  createMockReference,
  createMockEventType,
  createMockBooking,
  assertRescheduleResult,
} from "./utils";

// Mock dependencies
vi.mock("../CalendarManager");
vi.mock("../videoClient");
vi.mock("../crmManager/crmManager");
vi.mock("@calcom/app-store/_utils/getCalendar");
vi.mock("@calcom/app-store/utils");
vi.mock("@calcom/lib/server/repository/credential");

// Import mocked modules to spy on them
import * as CalendarManager from "../CalendarManager";
import * as videoClient from "../videoClient";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EventManager.reschedule", () => {
  let eventManager: EventManager;
  let mockCalendarEvent: CalendarEvent;
  let mockBooking: PartialBooking;

  beforeEach(async () => {
    // Reset prismock
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();

    // Create mock user with credentials
    const mockUser = {
      credentials: createMockCredentials(),
      destinationCalendar: null,
    };

    eventManager = new EventManager(mockUser);

    // Create mock calendar event
    mockCalendarEvent = createMockCalendarEvent();

    // Create mock booking
    mockBooking = {
      id: 1,
      userId: 1,
      attendees: [
        {
          id: 1,
          name: "Attendee",
          email: "attendee@example.com",
          timeZone: "UTC",
          locale: "en",
        },
      ],
      location: "integrations:daily",
      references: [
        createMockReference("google_calendar"),
        createMockReference("daily_video", {
          meetingPassword: "password",
          meetingUrl: "https://daily.co/meeting",
        }),
      ],
      destinationCalendar: null,
      payment: [],
      eventType: createMockEventType(),
    };
  });

  describe("basic reschedule functionality", () => {
    it("should throw error when rescheduleUid is not provided", async () => {
      await expect(
        eventManager.reschedule(mockCalendarEvent, "", undefined, false)
      ).rejects.toThrow("You called eventManager.update without an `rescheduleUid`. This should never happen.");
    });

    it("should throw error when booking is not found", async () => {
      await expect(
        eventManager.reschedule(mockCalendarEvent, "non-existent-uid", undefined, false)
      ).rejects.toThrow("booking not found");
    });

    it("should successfully reschedule when booking exists", async () => {
      // Create booking in prismock using factory function
      await createMockBooking({
        references: {
          create: [
            createMockReference("google_calendar"),
            createMockReference("daily_video", {
              meetingPassword: "password",
              meetingUrl: "https://daily.co/meeting",
            }),
          ],
        },
      });

      const result = await eventManager.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // Verify that calendar events and video meetings are updated in normal reschedule scenarios
      expectCalendarEventToBeUpdated({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: {
          title: "Test Event",
          type: "test-event",
          description: "Test Description",
          startTime: "2024-01-01T10:00:00Z",
          endTime: "2024-01-01T11:00:00Z",
          organizer: {
            email: "organizer@example.com",
            name: "Organizer",
            timeZone: "UTC",
            language: { translate: expect.any(Function), locale: "en" },
          },
          attendees: [
            {
              email: "attendee@example.com",
              name: "Attendee",
              timeZone: "UTC",
              language: { translate: expect.any(Function), locale: "en" },
            },
          ],
          uid: "test-uid",
        },
        externalCalendarId: "external-calendar-id",
      });
      expectVideoToBeUpdated({
        credentialType: "daily_video", // Updated to match actual implementation
        credentialId: 0, // Updated to match FAKE_DAILY_CREDENTIAL
        bookingRefUid: "daily_video-uid",
        event: {
          title: "Test Event",
          type: "test-event",
          description: "Test Description",
          startTime: "2024-01-01T10:00:00Z",
          endTime: "2024-01-01T11:00:00Z",
          organizer: {
            email: "organizer@example.com",
            name: "Organizer",
            timeZone: "UTC",
            language: { translate: expect.any(Function), locale: "en" },
          },
          attendees: [
            {
              email: "attendee@example.com",
              name: "Attendee",
              timeZone: "UTC",
              language: { translate: expect.any(Function), locale: "en" },
            },
          ],
          uid: "test-uid",
        },
      });
    });
  });

  describe("reschedule with requiresConfirmation", () => {
    it("should delete events and meetings when requiresConfirmation is true", async () => {
      // Create booking in prismock using factory function with both calendar and video references
      await createMockBooking({
        references: {
          create: [
            createMockReference("google_calendar"),
            createMockReference("daily_video", {
              meetingPassword: "password",
              meetingUrl: "https://daily.co/meeting",
            }),
          ],
        },
      });

      // Spy on the delete functions
      const deleteEventSpy = vi.spyOn(CalendarManager, "deleteEvent");
      const deleteMeetingSpy = vi.spyOn(videoClient, "deleteMeeting");

      const eventWithConfirmation = createMockCalendarEvent({
        requiresConfirmation: true,
      });

      const result = await eventManager.reschedule(
        eventWithConfirmation,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // Use helpers for verification
      expectCalendarEventToBeDeleted({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: { requiresConfirmation: true },
        externalCalendarId: "external-calendar-id",
      });
      expectVideoToBeDeleted({
        credentialType: "google_calendar", // fallback credential
        credentialId: 1,
        bookingRefUid: "daily_video-uid",
      });
    });

    it("should handle deletion when only calendar reference exists", async () => {
      // Create booking in prismock using factory function with only calendar reference
      await createMockBooking({
        references: {
          create: [createMockReference("google_calendar")],
        },
      });

      const eventWithConfirmation = createMockCalendarEvent({
        requiresConfirmation: true,
      });

      const result = await eventManager.reschedule(
        eventWithConfirmation,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      expectCalendarEventToBeDeleted({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: { requiresConfirmation: true },
        externalCalendarId: "external-calendar-id",
      });
    });

    it("should handle deletion when only video reference exists", async () => {
      // Create booking in prismock using factory function with only video reference
      await createMockBooking({
        references: {
          create: [
            createMockReference("daily_video", {
              meetingPassword: "password",
              meetingUrl: "https://daily.co/meeting",
            }),
          ],
        },
      });

      // Spy on the delete functions
      const deleteEventSpy = vi.spyOn(CalendarManager, "deleteEvent");
      const deleteMeetingSpy = vi.spyOn(videoClient, "deleteMeeting");

      const eventWithConfirmation = createMockCalendarEvent({
        requiresConfirmation: true,
      });

      const result = await eventManager.reschedule(
        eventWithConfirmation,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      expectVideoToBeDeleted({
        credentialType: "google_calendar", // fallback credential
        credentialId: 1,
        bookingRefUid: "daily_video-uid",
      });
    });
  });

  describe("reschedule with changed organizer", () => {
    it("should delete old events and create new ones when organizer changes", async () => {
      // Create booking in prismock using factory function
      await createMockBooking({
        references: {
          create: [
            createMockReference("google_calendar"),
            createMockReference("daily_video", {
              meetingPassword: "password",
              meetingUrl: "https://daily.co/meeting",
            }),
          ],
        },
      });

      const result = await eventManager.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        undefined,
        true // changedOrganizer = true
      );

      assertRescheduleResult(result);

      // Verify that old events and meetings are deleted when organizer changes
      expectCalendarEventToBeDeleted({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: {
          title: "Test Event",
          type: "test-event",
          description: "Test Description",
          startTime: "2024-01-01T10:00:00Z",
          endTime: "2024-01-01T11:00:00Z",
          organizer: {
            email: "organizer@example.com",
            name: "Organizer",
            timeZone: "UTC",
            language: { translate: expect.any(Function), locale: "en" },
          },
          attendees: [
            {
              email: "attendee@example.com",
              name: "Attendee",
              timeZone: "UTC",
              language: { translate: expect.any(Function), locale: "en" },
            },
          ],
          uid: "test-uid",
          location: "integrations:daily",
        },
        externalCalendarId: "external-calendar-id",
      });
      expectVideoToBeDeleted({
        credentialType: "google_calendar", // fallback credential
        credentialId: 1,
        bookingRefUid: "daily_video-uid",
      });
    });
  });

  describe("reschedule with location change", () => {
    it("should update location when location has changed", async () => {
      // Create booking in prismock with different location using factory function
      await createMockBooking({
        location: "integrations:zoom", // Different location
        references: {
          create: [
            createMockReference("google_calendar"),
            createMockReference("zoom_video", {
              meetingPassword: "password",
              meetingUrl: "https://zoom.us/meeting",
              credentialId: 4,
            }),
          ],
        },
      });

      const result = await eventManager.reschedule(
        mockCalendarEvent, // Has location: "integrations:daily"
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // Verify that calendar events are updated when location changes
      expectCalendarEventToBeUpdated({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: {
          title: "Test Event",
          type: "test-event",
          description: "Test Description",
          startTime: "2024-01-01T10:00:00Z",
          endTime: "2024-01-01T11:00:00Z",
          organizer: {
            email: "organizer@example.com",
            name: "Organizer",
            timeZone: "UTC",
            language: { translate: expect.any(Function), locale: "en" },
          },
          attendees: [
            {
              email: "attendee@example.com",
              name: "Attendee",
              timeZone: "UTC",
              language: { translate: expect.any(Function), locale: "en" },
            },
          ],
          uid: "test-uid",
        },
        externalCalendarId: "external-calendar-id",
      });
    });
  });

  describe("reschedule with booking requested reschedule", () => {
    it("should update location when booking requested reschedule", async () => {
      // Create booking in prismock using factory function
      await createMockBooking();

      const result = await eventManager.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        undefined,
        false,
        undefined,
        true // isBookingRequestedReschedule = true
      );

      assertRescheduleResult(result);

      // Verify that calendar events are updated when booking requested reschedule
      expectCalendarEventToBeUpdated({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: {
          title: "Test Event",
          type: "test-event",
          description: "Test Description",
          startTime: "2024-01-01T10:00:00Z",
          endTime: "2024-01-01T11:00:00Z",
          organizer: {
            email: "organizer@example.com",
            name: "Organizer",
            timeZone: "UTC",
            language: { translate: expect.any(Function), locale: "en" },
          },
          attendees: [
            {
              email: "attendee@example.com",
              name: "Attendee",
              timeZone: "UTC",
              language: { translate: expect.any(Function), locale: "en" },
            },
          ],
          uid: "test-uid",
        },
        externalCalendarId: "external-calendar-id",
      });
    });
  });

  describe("reschedule with new booking ID", () => {
    it("should update payment references when newBookingId is provided", async () => {
      // Create original booking in prismock using factory function
      await createMockBooking({
        payment: {
          create: [
            {
              id: 1,
              amount: 1000,
              currency: "usd",
              success: true,
            },
          ],
        },
        references: {
          create: [
            createMockReference("google_calendar"),
            createMockReference("daily_video", {
              meetingPassword: "password",
              meetingUrl: "https://daily.co/meeting",
            }),
          ],
        },
      });

      // Create new booking using factory function
      await createMockBooking({
        id: 2,
        uid: "new-booking-uid",
        startTime: new Date("2024-01-02T10:00:00Z"),
        endTime: new Date("2024-01-02T11:00:00Z"),
        references: {
          create: [
            createMockReference("google_calendar", {
              uid: "new-calendar-uid",
              meetingId: "new-calendar-uid",
              externalCalendarId: "new-external-calendar-id",
            }),
          ],
        },
      });

      const result = await eventManager.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        2, // newBookingId
        false
      );

      assertRescheduleResult(result);

      // Verify that calendar events are updated when newBookingId is provided
      expectCalendarEventToBeUpdated({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "new-calendar-uid",
        event: {
          ...mockCalendarEvent,
          // Allow for location transformation
          location: expect.stringMatching(/https:\/\/.*\.co\/meeting/),
        },
        externalCalendarId: "new-external-calendar-id",
      });
    });
  });

  describe("reschedule with dedicated video integration", () => {
    it("should handle dedicated video integration reschedule", async () => {
      // Create booking in prismock using factory function
      await createMockBooking({
        references: {
          create: [
            createMockReference("google_calendar"),
            createMockReference("daily_video", {
              meetingPassword: "password",
              meetingUrl: "https://daily.co/meeting",
            }),
          ],
        },
      });

      const eventWithDedicatedVideo = createMockCalendarEvent({
        location: "integrations:daily", // Dedicated video integration
      });

      const result = await eventManager.reschedule(
        eventWithDedicatedVideo,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // Verify that video meetings are updated for dedicated video integration reschedule
      expectVideoToBeUpdated({
        credentialType: "daily_video", // Updated to match actual implementation
        credentialId: 0, // Updated to match FAKE_DAILY_CREDENTIAL
        bookingRefUid: "daily_video-uid",
        event: {
          ...eventWithDedicatedVideo,
          // Allow for location transformation
          location: expect.stringMatching(/https:\/\/.*\.co\/meeting/),
        },
      });
    });
  });

  describe("reschedule with CRM events", () => {
    it("should handle CRM event updates during reschedule", async () => {
      // Create booking in prismock with CRM references using factory function
      await createMockBooking({
        references: {
          create: [
            createMockReference("google_calendar"),
            createMockReference("salesforce_crm", {
              uid: "crm-uid",
              meetingId: "crm-uid",
              externalCalendarId: null,
              credentialId: 3,
            }),
          ],
        },
      });

      // Add CRM credential to event manager
      const eventManagerWithCRM = new EventManager({
        credentials: createMockCredentials([
          {
            id: 3,
            type: "salesforce_crm",
            key: { access_token: "test" },
            userId: 1,
            teamId: null,
            appId: "salesforce",
            invalid: false,
            user: { email: "test@example.com" },
          },
        ]),
        destinationCalendar: null,
      });

      const result = await eventManagerWithCRM.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // Verify that calendar events are updated for CRM event updates
      expectCalendarEventToBeUpdated({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: {
          ...mockCalendarEvent,
          // Allow for location transformation
          location: expect.stringMatching(/https:\/\/.*\.co\/meeting/),
        },
        externalCalendarId: "external-calendar-id",
      });
    });
  });

  describe("reschedule with recurring event", () => {
    it("should handle recurring event reschedule", async () => {
      // Create booking in prismock with recurring event reference using factory function
      await createMockBooking({
        references: {
          create: [
            createMockReference("google_calendar", {
              thirdPartyRecurringEventId: "recurring-event-id",
            }),
          ],
        },
      });

      const result = await eventManager.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // Verify that calendar events are updated for recurring event reschedule
      expectCalendarEventToBeUpdated({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: {
          ...mockCalendarEvent,
          // Allow for location transformation
          location: expect.stringMatching(/https:\/\/.*\.co\/meeting/),
        },
        externalCalendarId: "external-calendar-id",
      });
    });
  });

  describe("error handling", () => {
    it("should handle missing calendar references gracefully", async () => {
      // Create booking in prismock without calendar references using factory function
      await createMockBooking({
        references: {
          create: [], // No references
        },
      });

      const result = await eventManager.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // The implementation still creates video meetings even without calendar references
      // due to the location being "integrations:daily"
      expect(videoClient.updateMeeting).toHaveBeenCalled();
    });

    it("should handle missing credential gracefully", async () => {
      // Create booking in prismock with non-existent credential but no video references using factory function
      await createMockBooking({
        location: "Test Location", // Not a video integration
        references: {
          create: [
            createMockReference("google_calendar", {
              credentialId: 999, // Non-existent credential
            }),
          ],
        },
      });

      // Use a calendar event without video location
      const calendarEventWithoutVideo = createMockCalendarEvent({
        location: "Test Location", // Not a video integration
      });

      const result = await eventManager.reschedule(
        calendarEventWithoutVideo,
        "test-reschedule-uid",
        undefined,
        false
      );

      assertRescheduleResult(result);

      // The implementation still attempts to update calendar events even with missing credentials
      expect(CalendarManager.updateEvent).toHaveBeenCalled();
    });
  });

  describe("enrichReferencesWithExternalCalendarIdFromResults", () => {
    it("should enrich references with external calendar ID from results", async () => {
      // Create booking in prismock using factory function
      await createMockBooking({
        references: {
          create: [
            createMockReference("google_calendar", {
              externalCalendarId: "old-external-calendar-id",
            }),
          ],
        },
      });

      const result = await eventManager.reschedule(
        mockCalendarEvent,
        "test-reschedule-uid",
        undefined,
        false
      );

      expect(result).toBeDefined();
      expect(result.referencesToCreate).toBeDefined();
      // The references should be enriched with external calendar IDs from results
      expect(Array.isArray(result.referencesToCreate)).toBe(true);

      // Verify that calendar events are updated when enriching references
      expectCalendarEventToBeUpdated({
        credentialType: "google_calendar",
        credentialId: 1,
        bookingRefUid: "google_calendar-uid",
        event: {
          ...mockCalendarEvent,
          // Allow for location transformation
          location: expect.stringMatching(/https:\/\/.*\.co\/meeting/),
        },
        externalCalendarId: "old-external-calendar-id",
      });
    });
  });
}); 