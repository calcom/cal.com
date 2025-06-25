import prismock from "../../../tests/libs/__mocks__/prisma";
import { vi, expect } from "vitest";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialBooking } from "@calcom/types/EventManager";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";

// Import mocked modules to spy on them
import * as CalendarManager from "../CalendarManager";
import * as videoClient from "../videoClient";

// Helper functions for verifying deletion
export function expectCalendarEventToBeDeleted({ credentialType, credentialId, bookingRefUid, event, externalCalendarId }) {
  const deleteEventMock = CalendarManager.deleteEvent;
  expect(deleteEventMock).toHaveBeenCalledTimes(1);
  expect(deleteEventMock).toHaveBeenCalledWith({
    credential: expect.objectContaining({
      type: credentialType,
      id: credentialId,
    }),
    bookingRefUid,
    event: expect.objectContaining(event),
    externalCalendarId,
  });
}

export function expectVideoToBeDeleted({ credentialType, credentialId, bookingRefUid }) {
  const deleteMeetingMock = videoClient.deleteMeeting;
  expect(deleteMeetingMock).toHaveBeenCalledTimes(1);
  expect(deleteMeetingMock).toHaveBeenCalledWith(
    expect.objectContaining({
      type: credentialType,
      id: credentialId,
    }),
    bookingRefUid
  );
}

// Helper functions for verifying updates
export function expectCalendarEventToBeUpdated({ credentialType, credentialId, bookingRefUid, event, externalCalendarId }) {
  const updateEventMock = CalendarManager.updateEvent;
  expect(updateEventMock).toHaveBeenCalledTimes(1);
  expect(updateEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      type: credentialType,
      id: credentialId,
    }),
    expect.objectContaining({
      ...event,
      // Allow for additional properties that may be added by the implementation
      conferenceData: expect.any(Object),
      videoCallData: expect.any(Object),
    }),
    bookingRefUid,
    externalCalendarId
  );
}

export function expectVideoToBeUpdated({ credentialType, credentialId, bookingRefUid, event }) {
  const updateMeetingMock = videoClient.updateMeeting;
  expect(updateMeetingMock).toHaveBeenCalledTimes(1);
  expect(updateMeetingMock).toHaveBeenCalledWith(
    expect.objectContaining({
      type: credentialType,
      id: credentialId,
    }),
    expect.objectContaining({
      ...event,
      // Allow for additional properties that may be added by the implementation
      conferenceData: expect.any(Object),
      videoCallData: expect.any(Object),
    }),
    expect.objectContaining({
      uid: bookingRefUid,
    })
  );
}

// Test data factory functions
export const createMockCredentials = (additionalCredentials: any[] = []) => [
  {
    id: 1,
    type: "google_calendar",
    key: { access_token: "test" },
    userId: 1,
    teamId: null,
    appId: "google",
    invalid: false,
    user: { email: "test@example.com" },
  },
  {
    id: 2,
    type: "daily_video",
    key: { api_key: "test" },
    userId: 1,
    teamId: null,
    appId: "daily",
    invalid: false,
    user: { email: "test@example.com" },
  },
  FAKE_DAILY_CREDENTIAL,
  ...additionalCredentials,
];

export const createMockCalendarEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  title: "Test Event",
  type: "test-event",
  description: "Test Description",
  startTime: "2024-01-01T10:00:00Z",
  endTime: "2024-01-01T11:00:00Z",
  organizer: {
    email: "organizer@example.com",
    name: "Organizer",
    timeZone: "UTC",
    language: { translate: vi.fn(), locale: "en" },
  },
  attendees: [
    {
      email: "attendee@example.com",
      name: "Attendee",
      timeZone: "UTC",
      language: { translate: vi.fn(), locale: "en" },
    },
  ],
  uid: "test-uid",
  location: "integrations:daily",
  destinationCalendar: [],
  ...overrides,
});

export const createMockReference = (type: string, overrides: any = {}) => ({
  type,
  uid: `${type}-uid`,
  meetingId: `${type}-uid`,
  meetingPassword: null,
  meetingUrl: null,
  externalCalendarId: type === "google_calendar" ? "external-calendar-id" : null,
  credentialId: type === "google_calendar" ? 1 : type === "daily_video" ? 2 : 3,
  ...overrides,
});

export const createMockEventType = () => ({
  seatsPerTimeSlot: null,
  seatsShowAttendees: false,
  seatsShowAvailabilityCount: false,
});

export const createMockBooking = async (overrides: any = {}) => {
  const defaultData = {
    id: 1,
    uid: "test-reschedule-uid",
    userId: 1,
    startTime: new Date("2024-01-01T10:00:00Z"),
    endTime: new Date("2024-01-01T11:00:00Z"),
    status: "ACCEPTED" as const,
    references: {
      create: [createMockReference("google_calendar")],
    },
    eventType: {
      create: createMockEventType(),
    },
  };

  return await prismock.booking.create({
    data: { ...defaultData, ...overrides },
  });
};

export const assertRescheduleResult = (result: any) => {
  expect(result).toBeDefined();
  expect(result.results).toBeDefined();
  expect(result.referencesToCreate).toBeDefined();
}; 