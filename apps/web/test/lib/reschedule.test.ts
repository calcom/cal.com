import {
  createBookingScenario,
  getGoogleCalendarCredential,
  getDate,
  mockCalendarToHaveNoBusySlots,
  mockCalendar,
  TestData,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { createMockNextJsRequest } from "@calcom/web/test/utils/bookingScenario/createMockNextJsRequest";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";

import { describe, it, expect, vi } from "vitest";

import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { ErrorCode } from "@calcom/lib/errorCodes";

vi.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@calcom/lib/server/i18n", () => {
  const t = (key: string) => key;
  return {
    getTranslation: () =>
      Promise.resolve({
        t,
        language: "en",
        exists: (key: string) => !!key,
        dir: () => "ltr",
        getFixedT: () => t,
      }),
    t,
    initI18n: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@calcom/lib/server/i18n/utils", () => ({
  localize: (value: string) => value,
}));

vi.mock("@calcom/lib/event", () => {
  return {
    getEventName: (eventNameObj: { eventName: string; t: (key: string) => string }, attendeeName: string) => {
      return eventNameObj.eventName;
    },
    nameObjectSchema: {
      parse: () => ({ firstName: "Test", lastName: "User" }),
    },
    parseName: (name: string | object) => {
      if (typeof name === "string") return name;
      return "Test User";
    },
    getIntroEventDescription: () => "Test description",
    getLocationValueForDB: () => "Test location",
    getTranslatedLocation: () => "Test location",
    EventNameObjectType: {},
  };
});

vi.mock("@calcom/lib/CalEventParser", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@calcom/lib/CalEventParser");
  return {
    ...actual,
    getRichDescription: vi
      .fn()
      .mockImplementation((event: { cancellationReason: string }, { t }: { t: (key: string) => string }) => {
        return `MOCK_DESCRIPTION: ${t("cancellation_reason")}: ${event.cancellationReason}`;
      }),
    getVideoCallUrlFromCalEvent: vi.fn().mockReturnValue("MOCK_VIDEO_CALL_URL"),
  };
});

vi.mock("@calcom/emails/email-manager", () => ({
  sendRescheduledEmailsAndSMS: vi.fn().mockImplementation(async () => {
    return { rescheduled: true };
  }),
}));

vi.mock("@calcom/app-store", () => {
  return {
    getEventTypeAppData: () => Promise.resolve(null),
    getLocationOptionsForSelect: () => Promise.resolve([]),
    getAppFromSlug: () => ({
      locationOption: {
        value: "integrations:daily",
        label: "Daily",
      },
    }),
    getAppFromLocationValue: () => ({
      locationOption: {
        value: "integrations:daily",
        label: "Daily",
      },
    }),
  };
});

vi.mock("@calcom/lib/videoClient", () => {
  return {
    getVideoAdapters: () => ({
      daily: {
        createMeeting: () => Promise.resolve({ id: "test-meeting-id", password: "test-password" }),
        updateMeeting: () => Promise.resolve({}),
      },
    }),
    updateMeeting: () => Promise.resolve({}),
  };
});

vi.mock("@calcom/lib/EventManager", () => {
  const EventManagerMock = function () {
    return {
      create: () =>
        Promise.resolve({
          type: "success",
          createdEvent: { id: "123" },
          uid: "test-uid",
          originalEvent: { id: "original-123" },
        }),
      reschedule: () =>
        Promise.resolve({
          responses: [],
          referencesToCreate: [],
          results: [
            {
              type: "google_calendar",
              success: true,
              updatedEvent: {
                iCalUID: "test-ical-uid",
                id: "event-123",
              },
            },
          ],
        }),
      delete: () => Promise.resolve({ success: true }),
      updateCalendarAdditionalInfo: () => Promise.resolve(undefined),
    };
  };

  return {
    EventManager: EventManagerMock,
    default: EventManagerMock,
  };
});

describe("Reschedule Tests - Booker Calendar Conflicts", () => {
  it("Should prevent rescheduling when booker has calendar conflict", async () => {
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

    // Create scenario with organizer and booker
    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 45,
          length: 45,
          seatsPerTimeSlot: 3,
          users: [{ id: 101 }],
          title: "Test Event Type",
          eventName: "Test Event Name",
        },
        // Booker's personal event type
        {
          id: 2,
          slotInterval: 45,
          length: 45,
          users: [{ id: 102 }],
          title: "Booker's Event",
          eventName: "Test Event Name",
        },
      ],
      users: [
        {
          id: 101,
          name: "Organizer",
          email: "organizer@example.com",
          username: "organizer",
          timeZone: "Asia/Kolkata",
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
        {
          id: 102,
          name: "Booker",
          email: "booker@example.com",
          username: "booker",
          timeZone: "Asia/Kolkata",
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
      ],
      bookings: [
        {
          uid: "ORIGINAL_BOOKING_UID",
          eventTypeId: 1,
          userId: 102,
          status: "ACCEPTED",
          startTime: `${plus1DateString}T04:00:00.000Z`,
          endTime: `${plus1DateString}T04:45:00.000Z`,
          attendees: [
            {
              email: "booker@example.com",
            },
          ],
        },
      ],
      apps: [TestData.apps["google-calendar"]],
    });

    // Mock booker's calendar to show busy during reschedule slot
    mockCalendar("googlecalendar", {
      create: {
        uid: "MOCK_ID",
      },
      busySlots: [
        {
          start: `${plus2DateString}T14:00:00.000Z`, // 7:30 PM IST
          end: `${plus2DateString}T14:30:00.000Z`,
        },
      ],
    });

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        rescheduleUid: "ORIGINAL_BOOKING_UID",
        start: `${plus2DateString}T14:00:00.000Z`, // 7:30 PM IST
        end: `${plus2DateString}T14:45:00.000Z`,
        responses: {
          email: "booker@example.com",
          name: "Booker",
        },
      },
    });

    const { req } = createMockNextJsRequest({
      method: "POST",
      body: mockBookingData,
    });

    await expect(async () => await handleNewBooking(req)).rejects.toThrowError(
      ErrorCode.NoAvailableUsersFound
    );
  });

  it("Should allow rescheduling when booker has no calendar conflict", async () => {
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 45,
          length: 45,
          seatsPerTimeSlot: 3,
          users: [{ id: 101 }],
          title: "Test Event Type",
          eventName: "Test Event Name",
        },
      ],
      users: [
        {
          id: 101,
          name: "Organizer",
          email: "organizer@example.com",
          username: "organizer",
          timeZone: "Asia/Kolkata",
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
        {
          id: 102,
          name: "Booker",
          email: "booker@example.com",
          username: "booker",
          timeZone: "Asia/Kolkata",
          schedules: [TestData.schedules.IstWorkHours],
          credentials: [getGoogleCalendarCredential()],
          selectedCalendars: [TestData.selectedCalendars.google],
        },
      ],
      bookings: [
        {
          uid: "ORIGINAL_BOOKING_UID",
          eventTypeId: 1,
          userId: 102,
          status: "ACCEPTED",
          startTime: `${plus1DateString}T04:00:00.000Z`,
          endTime: `${plus1DateString}T04:45:00.000Z`,
          attendees: [
            {
              email: "booker@example.com",
            },
          ],
        },
      ],
      apps: [TestData.apps["google-calendar"]],
    });

    // Mock empty calendars for both organizer and booker
    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        uid: "MOCK_ID_ORGANIZER",
      },
    });
    mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        uid: "MOCK_ID_BOOKER",
      },
    });

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        rescheduleUid: "ORIGINAL_BOOKING_UID",
        start: `${plus2DateString}T10:00:00.000Z`, // 15:30 IST (within 9:30-18:00)
        end: `${plus2DateString}T10:45:00.000Z`,
        responses: {
          email: "booker@example.com",
          name: "Booker",
        },
      },
    });

    const { req } = createMockNextJsRequest({
      method: "POST",
      body: mockBookingData,
      userId: 102,
    });

    const { uid } = await handleNewBooking(req);
    expect(uid).toBeTruthy();
  });
});
