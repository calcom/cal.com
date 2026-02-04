import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
  getOrganizer,
  getScenarioData,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { expectWebhookToHaveBeenCalledWith } from "@calcom/testing/lib/bookingScenario/expects";
import { setupAndTeardown } from "@calcom/testing/lib/bookingScenario/setupAndTeardown";

import { describe, vi, test, expect } from "vitest";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import dayjs from "@calcom/dayjs";
import { TimeUnit } from "@calcom/prisma/enums";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";

import { calculateMaxStartTime } from "./common";
import { getMeetingSessionsFromRoomName } from "./getMeetingSessionsFromRoomName";
import type { TSendNoShowWebhookPayloadSchema } from "./schema";
import { triggerHostNoShow } from "./triggerHostNoShow";
import { WebhookVersion } from "../../../webhooks/lib/interface/IWebhookRepository";

vi.mock("@calcom/features/tasker/tasks/triggerNoShow/getMeetingSessionsFromRoomName", () => ({
  getMeetingSessionsFromRoomName: vi.fn(),
}));

const timeout = process.env.CI ? 5000 : 20000;

const EMPTY_MEETING_SESSIONS = {
  total_count: 0,
  data: [],
};

describe("Trigger Host No Show:", () => {
  setupAndTeardown();

  test(
    `Should trigger host no show webhook when no one joined the call`,
    async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      const uidOfBooking = "n5Wv3eHgconAED2j4gcVhP";
      const iCalUID = `${uidOfBooking}@Cal.com`;
      const subscriberUrl = "http://my-webhook.example.com";
      const bookingStartTime = `${plus1DateString}T05:00:00.000Z`;

      await createBookingScenario(
        getScenarioData({
          webhooks: [
            {
              id: "22",
              userId: organizer.id,
              eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
              subscriberUrl,
              active: true,
              eventTypeId: 1,
              appId: null,
              time: 5,
              timeUnit: TimeUnit.MINUTE,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 222,
              uid: uidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: bookingStartTime,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              user: { id: organizer.id },
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                  externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                  credentialId: undefined,
                },
              ],
              iCalUID,
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      vi.mocked(getMeetingSessionsFromRoomName).mockResolvedValue(EMPTY_MEETING_SESSIONS);

      const TEST_WEBHOOK = {
        id: "22",
        eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
        subscriberUrl,
        active: true,
        eventTypeId: 1,
        appId: null,
        time: 5,
        timeUnit: TimeUnit.MINUTE,
        payloadTemplate: null,
        secret: null,
        version: WebhookVersion.V_2021_10_20,
      };

      const payload = JSON.stringify({
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        bookingId: 222,
        webhook: TEST_WEBHOOK,
      } satisfies TSendNoShowWebhookPayloadSchema);

      await triggerHostNoShow(payload);
      const maxStartTime = calculateMaxStartTime(bookingStartTime as unknown as Date, 5, TimeUnit.MINUTE);
      const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

      await expectWebhookToHaveBeenCalledWith(subscriberUrl, {
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        payload: {
          title: "Test Booking Title",
          attendees: [],
          bookingId: 222,
          bookingUid: uidOfBooking,
          participants: [],
          hostEmail: "organizer@example.com",
          noShowHost: true,
          startTime: `${plus1DateString}T05:00:00.000Z`,
          endTime: `${plus1DateString}T05:15:00.000Z`,
          eventType: {
            id: 1,
            teamId: null,
            parentId: null,
            calVideoSettings: null,
          },
          webhook: {
            ...TEST_WEBHOOK,
            secret: undefined,
            active: undefined,
            eventTypeId: undefined,
          },
          message: `Host with email ${organizer.email} didn't join the call or didn't join before ${maxStartTimeHumanReadable}`,
        },
      });
    },
    timeout
  );

  test(
    `Should trigger host no show webhook when host didn't joined the call`,
    async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      const uidOfBooking = "n5Wv3eHgconAED2j4gcVhP";
      const iCalUID = `${uidOfBooking}@Cal.com`;
      const subscriberUrl = "http://my-webhook.example.com";
      const bookingStartTime = `${plus1DateString}T05:00:00.000Z`;

      await createBookingScenario(
        getScenarioData({
          webhooks: [
            {
              id: "22",
              userId: organizer.id,
              eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
              subscriberUrl,
              active: true,
              eventTypeId: 1,
              appId: null,
              time: 5,
              timeUnit: TimeUnit.MINUTE,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 222,
              uid: uidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: bookingStartTime,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              user: { id: organizer.id },
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                  externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                  credentialId: undefined,
                },
              ],
              iCalUID,
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      const MOCKED_PARTICIPANTS = [
        {
          user_id: null,
          participant_id: "MOCK_PARTICIPANT_ID",
          user_name: "MOCK_USER_NAME",
          join_time: 0,
          duration: 15,
        },
      ];

      const MOCKED_MEETING_SESSIONS = {
        total_count: 1,
        data: [
          {
            id: "MOCK_ID",
            room: "MOCK_ROOM",
            start_time: 1234567890,
            duration: 15,
            max_participants: 1,
            // User with id 101 is not in the participants list
            participants: MOCKED_PARTICIPANTS,
          },
        ],
      };

      vi.mocked(getMeetingSessionsFromRoomName).mockResolvedValue(MOCKED_MEETING_SESSIONS);

      const TEST_WEBHOOK = {
        id: "22",
        eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
        subscriberUrl,
        active: true,
        eventTypeId: 1,
        appId: null,
        time: 5,
        timeUnit: TimeUnit.MINUTE,
        payloadTemplate: null,
        secret: null,
        version: WebhookVersion.V_2021_10_20,
      };

      const payload = JSON.stringify({
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        bookingId: 222,
        webhook: TEST_WEBHOOK,
      } satisfies TSendNoShowWebhookPayloadSchema);

      await triggerHostNoShow(payload);

      const maxStartTime = calculateMaxStartTime(bookingStartTime as unknown as Date, 5, TimeUnit.MINUTE);
      const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

      await expectWebhookToHaveBeenCalledWith(subscriberUrl, {
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        payload: {
          title: "Test Booking Title",
          attendees: [],
          bookingId: 222,
          bookingUid: uidOfBooking,
          participants: MOCKED_PARTICIPANTS,
          hostEmail: "organizer@example.com",
          noShowHost: true,
          startTime: `${plus1DateString}T05:00:00.000Z`,
          endTime: `${plus1DateString}T05:15:00.000Z`,
          eventType: {
            id: 1,
            teamId: null,
            parentId: null,
            calVideoSettings: null,
          },
          webhook: {
            ...TEST_WEBHOOK,
            secret: undefined,
            active: undefined,
            eventTypeId: undefined,
          },
          message: `Host with email ${organizer.email} didn't join the call or didn't join before ${maxStartTimeHumanReadable}`,
        },
      });
    },
    timeout
  );

  test(
    `Should trigger host no show webhook when host didn't joined the rescheduled call`,
    async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      const uidOfBooking = "j5Wv3eHgconAED2j4gcVhP";
      const iCalUID = `${uidOfBooking}@Cal.com`;
      const subscriberUrl = "http://my-webhook.example.com";
      const bookingStartTime = `${plus1DateString}T05:00:00.000Z`;

      const newUidOfBooking = "k5Wv3eHgconAED2j4gcVhP";
      const newiCalUID = `${newUidOfBooking}@Cal.com`;
      const newBookingStartTime = `${plus1DateString}T05:15:00.000Z`;

      await createBookingScenario(
        getScenarioData({
          webhooks: [
            {
              id: "23",
              userId: organizer.id,
              eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
              subscriberUrl,
              active: true,
              eventTypeId: 1,
              appId: null,
              time: 5,
              timeUnit: TimeUnit.MINUTE,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 223,
              uid: uidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.CANCELLED,
              rescheduled: true,
              rescheduledBy: organizer.email,
              startTime: bookingStartTime,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              user: { id: organizer.id },
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                  externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                  credentialId: undefined,
                },
              ],
              iCalUID,
            },
            {
              id: 224,
              uid: newUidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: newBookingStartTime,
              endTime: `${plus1DateString}T05:30:00.000Z`,
              user: { id: organizer.id },
              fromReschedule: uidOfBooking,
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                  externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                  credentialId: undefined,
                },
              ],
              iCalUID: newiCalUID,
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      const MOCKED_PARTICIPANTS = [
        {
          user_id: null,
          participant_id: "MOCK_PARTICIPANT_ID",
          user_name: "MOCK_USER_NAME",
          join_time: 0,
          duration: 15,
        },
      ];

      const MOCKED_MEETING_SESSIONS = {
        total_count: 1,
        data: [
          {
            id: "MOCK_ID",
            room: "MOCK_ROOM",
            start_time: 1234567890,
            duration: 15,
            max_participants: 1,
            // User with id 101 is not in the participants list
            participants: MOCKED_PARTICIPANTS,
          },
        ],
      };

      vi.mocked(getMeetingSessionsFromRoomName).mockResolvedValue(MOCKED_MEETING_SESSIONS);

      const TEST_WEBHOOK = {
        id: "23",
        eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
        subscriberUrl,
        active: true,
        eventTypeId: 1,
        appId: null,
        time: 5,
        timeUnit: TimeUnit.MINUTE,
        payloadTemplate: null,
        secret: null,
        version: WebhookVersion.V_2021_10_20,
      };

      const payload = JSON.stringify({
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        bookingId: 224,
        webhook: TEST_WEBHOOK,
      } satisfies TSendNoShowWebhookPayloadSchema);

      await triggerHostNoShow(payload);

      const maxStartTime = calculateMaxStartTime(newBookingStartTime as unknown as Date, 5, TimeUnit.MINUTE);
      const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

      await expectWebhookToHaveBeenCalledWith(subscriberUrl, {
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        payload: {
          title: "Test Booking Title",
          attendees: [],
          bookingId: 224,
          bookingUid: newUidOfBooking,
          participants: MOCKED_PARTICIPANTS,
          hostEmail: "organizer@example.com",
          noShowHost: true,
          startTime: `${plus1DateString}T05:15:00.000Z`,
          endTime: `${plus1DateString}T05:30:00.000Z`,
          rescheduledBy: organizer.email,
          eventType: {
            id: 1,
            teamId: null,
            parentId: null,
            calVideoSettings: null,
          },
          webhook: {
            ...TEST_WEBHOOK,
            secret: undefined,
            active: undefined,
            eventTypeId: undefined,
          },
          message: `Host with email ${organizer.email} didn't join the call or didn't join before ${maxStartTimeHumanReadable}`,
        },
      });
    },
    timeout
  );

  test(
    `Should send updated attendees with noShow=true when host in attendees table doesn't join`,
    async () => {
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
        credentials: [getGoogleCalendarCredential()],
        selectedCalendars: [TestData.selectedCalendars.google],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      const uidOfBooking = "n5Wv3eHgconAED2j4gcVhP";
      const iCalUID = `${uidOfBooking}@Cal.com`;
      const subscriberUrl = "http://my-webhook.example.com";
      const bookingStartTime = `${plus1DateString}T05:00:00.000Z`;

      await createBookingScenario(
        getScenarioData({
          webhooks: [
            {
              id: "22",
              userId: organizer.id,
              eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
              subscriberUrl,
              active: true,
              eventTypeId: 1,
              appId: null,
              time: 5,
              timeUnit: TimeUnit.MINUTE,
            },
          ],
          eventTypes: [
            {
              id: 1,
              slotInterval: 15,
              length: 15,
              users: [
                {
                  id: 101,
                },
              ],
            },
          ],
          bookings: [
            {
              id: 222,
              uid: uidOfBooking,
              eventTypeId: 1,
              status: BookingStatus.ACCEPTED,
              startTime: bookingStartTime,
              endTime: `${plus1DateString}T05:15:00.000Z`,
              user: { id: organizer.id },
              attendees: [
                {
                  email: "guest@example.com",
                  name: "Guest User",
                  timeZone: "UTC",
                  locale: "en",
                },
              ],
              metadata: {
                videoCallUrl: "https://existing-daily-video-call-url.example.com",
              },
              references: [
                {
                  type: appStoreMetadata.dailyvideo.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASS",
                  meetingUrl: "http://mock-dailyvideo.example.com",
                  credentialId: null,
                },
                {
                  type: appStoreMetadata.googlecalendar.type,
                  uid: "MOCK_ID",
                  meetingId: "MOCK_ID",
                  meetingPassword: "MOCK_PASSWORD",
                  meetingUrl: "https://UNUSED_URL",
                  externalCalendarId: "MOCK_EXTERNAL_CALENDAR_ID",
                  credentialId: undefined,
                },
              ],
              iCalUID,
            },
          ],
          organizer,
          apps: [TestData.apps["google-calendar"], TestData.apps["daily-video"]],
        })
      );

      vi.mocked(getMeetingSessionsFromRoomName).mockResolvedValue(EMPTY_MEETING_SESSIONS);

      const TEST_WEBHOOK = {
        id: "22",
        eventTriggers: [WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW],
        subscriberUrl,
        active: true,
        eventTypeId: 1,
        appId: null,
        time: 5,
        timeUnit: TimeUnit.MINUTE,
        payloadTemplate: null,
        secret: null,
        version: WebhookVersion.V_2021_10_20,
      };

      const payload = JSON.stringify({
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        bookingId: 222,
        webhook: TEST_WEBHOOK,
      } satisfies TSendNoShowWebhookPayloadSchema);

      await triggerHostNoShow(payload);
      const maxStartTime = calculateMaxStartTime(bookingStartTime as unknown as Date, 5, TimeUnit.MINUTE);
      const maxStartTimeHumanReadable = dayjs.unix(maxStartTime).format("YYYY-MM-DD HH:mm:ss Z");

      await expectWebhookToHaveBeenCalledWith(subscriberUrl, {
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        payload: {
          title: "Test Booking Title",
          attendees: [
            expect.objectContaining({
              email: "guest@example.com",
              name: "Guest User",
            }),
          ],
          bookingId: 222,
          bookingUid: uidOfBooking,
          participants: [],
          hostEmail: "organizer@example.com",
          noShowHost: true,
          startTime: `${plus1DateString}T05:00:00.000Z`,
          endTime: `${plus1DateString}T05:15:00.000Z`,
          eventType: {
            id: 1,
            teamId: null,
            parentId: null,
            calVideoSettings: null,
          },
          webhook: {
            ...TEST_WEBHOOK,
            secret: undefined,
            active: undefined,
            eventTypeId: undefined,
          },
          message: `Host with email ${organizer.email} didn't join the call or didn't join before ${maxStartTimeHumanReadable}`,
        },
      });
    },
    timeout
  );
});
