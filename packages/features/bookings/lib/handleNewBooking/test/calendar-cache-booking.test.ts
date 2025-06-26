import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getBooker,
  getScenarioData,
  mockCalendarToHaveNoBusySlots,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import {
  expectBookingToBeInDatabase,
  expectSuccessfulCalendarEventCreationInCalendar,
} from "@calcom/web/test/utils/bookingScenario/expects";
import { getMockRequestDataForBooking } from "@calcom/web/test/utils/bookingScenario/getMockRequestDataForBooking";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(() => ({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockImplementation((feature: string) => {
      if (feature === "calendar-cache") {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    }),
  })),
}));

vi.mock("@calcom/lib/videoClient", () => ({
  getVideoAdapters: vi.fn().mockReturnValue([]),
  createMeeting: vi.fn().mockResolvedValue({
    type: "daily_video",
    id: "mock-meeting-id",
    password: "",
    url: "http://mock-dailyvideo.example.com",
  }),
}));

describe("Booking with Calendar Cache Enabled", () => {
  setupAndTeardown();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create booking and mark calendar cache as stale when calendar cache is enabled", async () => {
    const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
      destinationCalendar: {
        integration: "google_calendar",
        externalId: "organizer@google-calendar.com",
        primaryEmail: "organizer@example.com",
      },
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            users: [{ id: 101 }],
          },
        ],
        organizer,
        apps: [TestData.apps["google-calendar"]],
      })
    );

    const credential = await prismock.credential.findFirst({
      where: { userId: organizer.id },
    });

    await prismock.calendarCache.create({
      data: {
        credentialId: credential!.id,
        key: JSON.stringify({ timeMin: "2025-01-01", timeMax: "2025-02-01" }),
        value: JSON.stringify([]),
        expiresAt: new Date(Date.now() + 3600000),
        stale: false,
      },
    });

    const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        uid: "MOCK_ID",
      },
    });

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
        },
      },
    });

    const createdBooking = await handleNewBooking({
      bookingData: mockBookingData,
    });

    await expectBookingToBeInDatabase({
      uid: createdBooking.uid!,
      eventTypeId: mockBookingData.eventTypeId,
      status: BookingStatus.ACCEPTED,
      references: [
        {
          type: "google_calendar",
          uid: "FALLBACK_MOCK_CALENDAR_EVENT_ID",
        },
      ],
    });

    const updatedCache = await prismock.calendarCache.findFirst({
      where: { credentialId: credential!.id },
    });
    expect(updatedCache?.stale).toBe(true);

    expectSuccessfulCalendarEventCreationInCalendar(calendarMock, {
      calendarId: "organizer@google-calendar.com",
      videoCallUrl: null,
    });
  });

  it("should create booking and invalidate cache for team event with multiple users", async () => {
    const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;

    const booker = getBooker({
      email: "booker@example.com",
      name: "Booker",
    });

    const organizer1 = getOrganizer({
      name: "Organizer 1",
      email: "organizer1@example.com",
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    const organizer2 = getOrganizer({
      name: "Organizer 2",
      email: "organizer2@example.com",
      id: 102,
      schedules: [TestData.schedules.IstWorkHours],
      credentials: [getGoogleCalendarCredential()],
      selectedCalendars: [TestData.selectedCalendars.google],
    });

    await createBookingScenario(
      getScenarioData({
        eventTypes: [
          {
            id: 1,
            slotInterval: 30,
            length: 30,
            schedulingType: "COLLECTIVE",
            users: [{ id: 101 }, { id: 102 }],
          },
        ],
        organizer: organizer1,
        usersApartFromOrganizer: [organizer2],
        apps: [TestData.apps["google-calendar"]],
      })
    );

    const credential1 = await prismock.credential.findFirst({
      where: { userId: organizer1.id },
    });
    const credential2 = await prismock.credential.findFirst({
      where: { userId: organizer2.id },
    });

    await prismock.calendarCache.createMany({
      data: [
        {
          credentialId: credential1!.id,
          key: JSON.stringify({ timeMin: "2025-01-01", timeMax: "2025-02-01" }),
          value: JSON.stringify([]),
          expiresAt: new Date(Date.now() + 3600000),
          stale: false,
        },
        {
          credentialId: credential2!.id,
          key: JSON.stringify({ timeMin: "2025-01-01", timeMax: "2025-02-01" }),
          value: JSON.stringify([]),
          expiresAt: new Date(Date.now() + 3600000),
          stale: false,
        },
      ],
    });

    const calendarMock = mockCalendarToHaveNoBusySlots("googlecalendar", {
      create: {
        uid: "MOCK_ID",
      },
    });

    const mockBookingData = getMockRequestDataForBooking({
      data: {
        eventTypeId: 1,
        responses: {
          email: booker.email,
          name: booker.name,
        },
      },
    });

    const createdBooking = await handleNewBooking({
      bookingData: mockBookingData,
    });

    await expectBookingToBeInDatabase({
      uid: createdBooking.uid!,
      eventTypeId: mockBookingData.eventTypeId,
      status: BookingStatus.ACCEPTED,
    });

    const updatedCaches = await prismock.calendarCache.findMany({
      where: {
        credentialId: {
          in: [credential1!.id, credential2!.id],
        },
      },
    });
    expect(updatedCaches).toHaveLength(2);
    expect(updatedCaches.every((cache) => cache.stale === true)).toBe(true);
  });
});
