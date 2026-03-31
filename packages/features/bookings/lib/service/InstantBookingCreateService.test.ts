import prismock from "../../../../testing/src/lib/__mocks__/prisma";

import {
  createBookingScenario,
  getScenarioData,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  mockSuccessfulVideoMeetingCreation,
  mockCalendarToHaveNoBusySlots,
  mockNoTranslations,
} from "../../../../testing/src/lib/bookingScenario/bookingScenario";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { sendNotification } from "@calcom/features/notifications/sendNotification";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import { getInstantBookingCreateService } from "../../di/InstantBookingCreateService.container";
import type { CreateInstantBookingData } from "../dto/types";

type InstantBookingTestData = CreateInstantBookingData & {
  instant: boolean;
  responses: {
    name: string;
    email: string;
    attendeePhoneNumber: string;
  };
};

vi.mock("@calcom/features/notifications/sendNotification", () => ({
  sendNotification: vi.fn(),
}));

vi.mock("@calcom/features/conferencing/lib/videoClient", () => ({
  createInstantMeetingWithCalVideo: vi.fn().mockResolvedValue({
    type: "daily_video",
    id: "MOCK_INSTANT_MEETING_ID",
    password: "MOCK_INSTANT_PASS",
    url: "http://mock-dailyvideo.example.com/instant-meeting-url",
  }),
}));

describe("handleInstantMeeting", () => {
  beforeEach(() => {
    mockNoTranslations();
  });
  describe("team event instant meeting", () => {
    it("should successfully create instant meeting for team event", async () => {
      const instantBookingCreateService = getInstantBookingCreateService();
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
              team: {
                id: 1,
              },
              instantMeetingExpiryTimeOffsetInSeconds: 90,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
        })
      );

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: `http://mock-dailyvideo.example.com/meeting-1`,
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
        },
      });

      const mockBookingData: InstantBookingTestData = {
        eventTypeId: 1,
        timeZone: "UTC",
        language: "en",
        start: `${plus1DateString}T04:00:00.000Z`,
        end: `${plus1DateString}T04:45:00.000Z`,
        responses: {
          name: "Test User",
          email: "test@example.com",
          attendeePhoneNumber: "+918888888888",
        },
        metadata: {},
        instant: true,
      };

      const result = await instantBookingCreateService.createBooking({
        bookingData: mockBookingData,
      });

      expect(result.message).toBe("Success");
      expect(result.bookingId).toBeDefined();
      expect(result.bookingUid).toBeDefined();
      expect(result.meetingTokenId).toBeDefined();
      expect(result.expires).toBeInstanceOf(Date);

      const booking = await prismock.booking.findUnique({
        where: { id: result.bookingId },
        select: { status: true, attendees: true, references: true },
      });

      expect(booking).toBeDefined();
      expect(booking?.status).toBe(BookingStatus.AWAITING_HOST);
      expect(booking?.attendees).toHaveLength(1);
      expect(booking?.attendees[0].email).toBe("test@example.com");
      expect(booking?.attendees[0].phoneNumber).toBe("+918888888888");
      expect(booking?.references).toHaveLength(1);
      expect(booking?.references[0].type).toBe("daily_video");
    });

    it("should throw error for non-team event types", async () => {
      const instantBookingCreateService = getInstantBookingCreateService();
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
        })
      );

      const mockBookingData: InstantBookingTestData = {
        eventTypeId: 1,
        timeZone: "UTC",
        language: "en",
        start: `${plus1DateString}T04:00:00.000Z`,
        end: `${plus1DateString}T04:45:00.000Z`,
        responses: {
          name: "Test User",
          email: "test@example.com",
          attendeePhoneNumber: "+918888888888",
        },
        metadata: {},
        instant: true,
      };

      await expect(
        instantBookingCreateService.createBooking({
          bookingData: mockBookingData,
        })
      ).rejects.toThrow("Only Team Event Types are supported for Instant Meeting");
    });

    it("sends browser notifications to all WEB_PUSH subscriptions only", async () => {
      const instantBookingCreateService = getInstantBookingCreateService();
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          eventTypes: [
            {
              id: 1,
              slotInterval: 45,
              length: 45,
              users: [
                {
                  id: 101,
                },
              ],
              team: {
                id: 1,
              },
              instantMeetingExpiryTimeOffsetInSeconds: 90,
            },
          ],
          organizer,
          apps: [TestData.apps["daily-video"], TestData.apps["google-calendar"]],
        })
      );

      await prismock.membership.upsert({
        where: {
          userId_teamId: {
            userId: 101,
            teamId: 1,
          },
        },
        create: {
          userId: 101,
          teamId: 1,
          accepted: true,
          role: MembershipRole.OWNER,
        },
        update: {
          accepted: true,
        },
      });

      await prismock.notificationsSubscriptions.create({
        data: {
          userId: 101,
          subscription: JSON.stringify({
            endpoint: "https://example.com/push/one",
            expirationTime: null,
            keys: { auth: "auth-one", p256dh: "p256dh-one" },
          }),
          type: "WEB_PUSH",
          platform: "WEB",
          identifier: "https://example.com/push/one",
        },
      });

      await prismock.notificationsSubscriptions.create({
        data: {
          userId: 101,
          subscription: JSON.stringify({
            endpoint: "https://example.com/push/two",
            expirationTime: null,
            keys: { auth: "auth-two", p256dh: "p256dh-two" },
          }),
          type: "WEB_PUSH",
          platform: "WEB",
          identifier: "https://example.com/push/two",
        },
      });

      await prismock.notificationsSubscriptions.create({
        data: {
          userId: 101,
          subscription: "{not-valid-json",
          type: "WEB_PUSH",
          platform: "WEB",
          identifier: "https://example.com/push/bad-json",
        },
      });

      await prismock.notificationsSubscriptions.create({
        data: {
          userId: 101,
          subscription: "ExponentPushToken[not-a-web-push-subscription]",
          type: "APP_PUSH",
          platform: "IOS",
          identifier: "ExponentPushToken[not-a-web-push-subscription]",
        },
      });

      mockSuccessfulVideoMeetingCreation({
        metadataLookupKey: "dailyvideo",
        videoMeetingData: {
          id: "MOCK_ID",
          password: "MOCK_PASS",
          url: "http://mock-dailyvideo.example.com/meeting-1",
        },
      });
      mockCalendarToHaveNoBusySlots("googlecalendar", {
        create: {
          uid: "MOCKED_GOOGLE_CALENDAR_EVENT_ID",
        },
      });

      vi.mocked(sendNotification).mockClear();

      const mockBookingData: InstantBookingTestData = {
        eventTypeId: 1,
        timeZone: "UTC",
        language: "en",
        start: `${plus1DateString}T04:00:00.000Z`,
        end: `${plus1DateString}T04:45:00.000Z`,
        responses: {
          name: "Test User",
          email: "test@example.com",
          attendeePhoneNumber: "+918888888888",
        },
        metadata: {},
        instant: true,
      };

      await instantBookingCreateService.createBooking({
        bookingData: mockBookingData,
      });

      expect(sendNotification).toHaveBeenCalledTimes(2);
      expect(sendNotification).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          subscription: expect.objectContaining({ endpoint: "https://example.com/push/one" }),
        })
      );
      expect(sendNotification).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          subscription: expect.objectContaining({ endpoint: "https://example.com/push/two" }),
        })
      );
    });
  });
});

function getDate(param: { dateIncrement?: number } = {}) {
  const { dateIncrement = 0 } = param;
  const date = new Date();
  date.setDate(date.getDate() + dateIncrement);
  return {
    date,
    dateString: date.toISOString().split("T")[0],
  };
}
