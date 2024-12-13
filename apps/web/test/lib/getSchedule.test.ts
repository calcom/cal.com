import CalendarManagerMock from "../../../../tests/libs/__mocks__/CalendarManager";

import {
  getDate,
  getGoogleCalendarCredential,
  createBookingScenario,
  createOrganization,
  getOrganizer,
  getScenarioData,
  Timezones,
  TestData,
  createCredentials,
  mockCrmApp,
} from "../utils/bookingScenario/bookingScenario";

import { describe, vi, test } from "vitest";

import dayjs from "@calcom/dayjs";
import { SchedulingType, type BookingStatus } from "@calcom/prisma/enums";
import { getAvailableSlots as getSchedule } from "@calcom/trpc/server/routers/viewer/slots/util";

import { expect, expectedSlotsForSchedule } from "./getSchedule/expects";
import { setupAndTeardown } from "./getSchedule/setupAndTeardown";
import { timeTravelToTheBeginningOfToday } from "./getSchedule/utils";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
}));

describe("getSchedule", () => {
  setupAndTeardown();
  describe("Calendar event", () => {
    test("correctly identifies unavailable slots from calendar", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([
        {
          start: `${plus2DateString}T04:45:00.000Z`,
          end: `${plus2DateString}T23:00:00.000Z`,
        },
      ]);

      const scenarioData = {
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
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps["google-calendar"]],
      };
      // An event with one accepted booking
      await createBookingScenario(scenarioData);

      const scheduleForDayWithAGoogleCalendarBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      // As per Google Calendar Availability, only 4PM(4-4:45PM) GMT slot would be available
      expect(scheduleForDayWithAGoogleCalendarBooking).toHaveTimeSlots([`04:00:00.000Z`], {
        dateString: plus2DateString,
      });
    });
  });

  // TODO: Move these inside describe('Team Event')
  describe("Round robin lead skip(i.e. use contact owner specified by teamMemberEmail) - CRM", async () => {
    test("correctly get slots for event with only round robin hosts", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      const crmCredential = {
        id: 1,
        type: "salesforce_crm",
        key: {
          clientId: "test-client-id",
        },
        userId: 1,
        teamId: null,
        appId: "salesforce",
        invalid: false,
        user: { email: "test@test.com" },
      };

      await createCredentials([crmCredential]);

      mockCrmApp("salesforce", {
        getContacts: [
          {
            id: "contact-id",
            email: "test@test.com",
            ownerEmail: "example@example.com",
          },
        ],
        createContacts: [{ id: "contact-id", email: "test@test.com" }],
      });

      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedulingType: "ROUND_ROBIN",
            metadata: {
              apps: {
                salesforce: {
                  enabled: true,
                  appCategories: ["crm"],
                  roundRobinLeadSkip: true,
                },
              },
            },
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.IstEveningShift],
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstMorningShift],
            defaultScheduleId: 2,
          },
        ],
        bookings: [],
      });

      const scheduleWithLeadSkip = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          teamMemberEmail: "example@example.com",
          orgSlug: null,
        },
      });

      // only slots where example@example.com is available
      expect(scheduleWithLeadSkip).toHaveTimeSlots(
        [`11:30:00.000Z`, `12:30:00.000Z`, `13:30:00.000Z`, `14:30:00.000Z`, `15:30:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );

      const scheduleWithoutLeadSkip = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      // slots where either one of the rr hosts is available
      expect(scheduleWithoutLeadSkip).toHaveTimeSlots(
        [
          `04:30:00.000Z`,
          `05:30:00.000Z`,
          `06:30:00.000Z`,
          `07:30:00.000Z`,
          `08:30:00.000Z`,
          `09:30:00.000Z`,
          `10:30:00.000Z`,
          `11:30:00.000Z`,
          `12:30:00.000Z`,
          `13:30:00.000Z`,
          `14:30:00.000Z`,
          `15:30:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });
    test("correctly get slots for event with round robin and fixed hosts", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      const crmCredential = {
        id: 1,
        type: "salesforce_crm",
        key: {
          clientId: "test-client-id",
        },
        userId: 1,
        teamId: null,
        appId: "salesforce",
        invalid: false,
        user: { email: "test@test.com" },
      };

      await createCredentials([crmCredential]);

      mockCrmApp("salesforce", {
        getContacts: [
          {
            id: "contact-id",
            email: "test@test.com",
            ownerEmail: "example@example.com",
          },
          {
            id: "contact-id-1",
            email: "test1@test.com",
            ownerEmail: "example1@example.com",
          },
        ],
        createContacts: [{ id: "contact-id", email: "test@test.com" }],
      });

      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            hosts: [
              {
                userId: 101,
                isFixed: true,
              },
              {
                userId: 102,
                isFixed: false,
              },
              {
                userId: 103,
                isFixed: false,
              },
            ],
            schedulingType: "ROUND_ROBIN",
            metadata: {
              apps: {
                salesforce: {
                  enabled: true,
                  appCategories: ["crm"],
                  roundRobinLeadSkip: true,
                },
              },
            },
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.IstMidShift],
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstMorningShift],
            defaultScheduleId: 2,
          },
          {
            ...TestData.users.example,
            email: "example2@example.com",
            id: 103,
            schedules: [TestData.schedules.IstEveningShift],

            defaultScheduleId: 3,
          },
        ],
        bookings: [],
      });

      const scheduleFixedHostLead = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          teamMemberEmail: "example@example.com",
          orgSlug: null,
        },
      });

      // show normal slots, example@example + one RR host needs to be available
      expect(scheduleFixedHostLead).toHaveTimeSlots(
        [
          `07:30:00.000Z`,
          `08:30:00.000Z`,
          `09:30:00.000Z`,
          `10:30:00.000Z`,
          `11:30:00.000Z`,
          `12:30:00.000Z`,
          `13:30:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );

      const scheduleRRHostLead = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          teamMemberEmail: "example1@example.com",
          orgSlug: null,
        },
      });

      // slots where example@example (fixed host) + example1@example.com are available together
      expect(scheduleRRHostLead).toHaveTimeSlots(
        [`07:30:00.000Z`, `08:30:00.000Z`, `09:30:00.000Z`, `10:30:00.000Z`, `11:30:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );
    });
    test("correctly get slots for event with only round robin hosts - When no availability is found", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      const crmCredential = {
        id: 1,
        type: "salesforce_crm",
        key: {
          clientId: "test-client-id",
        },
        userId: 1,
        teamId: null,
        appId: "salesforce",
        invalid: false,
        user: { email: "test@test.com" },
      };

      await createCredentials([crmCredential]);

      mockCrmApp("salesforce", {
        getContacts: [
          {
            id: "contact-id",
            email: "test@test.com",
            ownerEmail: "example@example.com",
          },
        ],
        createContacts: [{ id: "contact-id", email: "test@test.com" }],
      });

      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedulingType: "ROUND_ROBIN",
            metadata: {
              apps: {
                salesforce: {
                  enabled: true,
                  appCategories: ["crm"],
                  roundRobinLeadSkip: true,
                },
              },
            },
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.EmptyAvailability],
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstMorningShift],
            defaultScheduleId: 2,
          },
        ],
        bookings: [],
      });

      const scheduleWithLeadSkip = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          teamMemberEmail: "example@example.com",
          orgSlug: null,
        },
      });

      // only slots where example@example.com is available
      expect(scheduleWithLeadSkip).toHaveDateDisabled({
        dateString: plus2DateString,
      });

      const scheduleWithoutLeadSkip = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      // slots where either one of the rr hosts is available
      expect(scheduleWithoutLeadSkip).toHaveTimeSlots(
        [
          `04:30:00.000Z`,
          `05:30:00.000Z`,
          `06:30:00.000Z`,
          `07:30:00.000Z`,
          `08:30:00.000Z`,
          `09:30:00.000Z`,
          `10:30:00.000Z`,
          `11:30:00.000Z`,
          `12:30:00.000Z`,
          `13:30:00.000Z`,
          `14:30:00.000Z`,
          `15:30:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });
    test("Negative case(i.e. skipContactOwner is true) - when teamMemberEmail is provided but not used", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      const crmCredential = {
        id: 1,
        type: "salesforce_crm",
        key: {
          clientId: "test-client-id",
        },
        userId: 1,
        teamId: null,
        appId: "salesforce",
        invalid: false,
        user: { email: "test@test.com" },
      };

      await createCredentials([crmCredential]);

      mockCrmApp("salesforce", {
        getContacts: [
          {
            id: "contact-id",
            email: "test@test.com",
            ownerEmail: "example@example.com",
          },
        ],
        createContacts: [{ id: "contact-id", email: "test@test.com" }],
      });

      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedulingType: "ROUND_ROBIN",
            metadata: {
              apps: {
                salesforce: {
                  enabled: true,
                  appCategories: ["crm"],
                  roundRobinLeadSkip: true,
                },
              },
            },
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.IstEveningShift],
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstMorningShift],
            defaultScheduleId: 2,
          },
        ],
        bookings: [],
      });

      const scheduleWhenContactOwnerIsSkipped = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          teamMemberEmail: "example@example.com",
          skipContactOwner: true,
          orgSlug: null,
        },
      });

      // Both users slot would be available as contact owner(example@example.com) is skipped and we fallback to all users of RR
      expect(scheduleWhenContactOwnerIsSkipped).toHaveTimeSlots(
        [
          `04:30:00.000Z`,
          `05:30:00.000Z`,
          `06:30:00.000Z`,
          `07:30:00.000Z`,
          `08:30:00.000Z`,
          `09:30:00.000Z`,
          `10:30:00.000Z`,
          `11:30:00.000Z`,
          `12:30:00.000Z`,
          `13:30:00.000Z`,
          `14:30:00.000Z`,
          `15:30:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });
  });

  describe("User Event", () => {
    test("correctly identifies unavailable slots from Cal Bookings in different status", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      // An event with one accepted booking
      await createBookingScenario({
        // An event with length 30 minutes, slotInterval 45 minutes, and minimumBookingNotice 1440 minutes (24 hours)
        eventTypes: [
          {
            id: 1,
            // If `slotInterval` is set, it supersedes `length`
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          // That event has one accepted booking from 4:00 to 4:15 in GMT on Day + 3 which is 9:30 to 9:45 in IST
          {
            eventTypeId: 1,
            userId: 101,
            status: "ACCEPTED",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus3DateString}T04:00:00.000Z`,
            endTime: `${plus3DateString}T04:15:00.000Z`,
          },
          {
            eventTypeId: 1,
            userId: 101,
            status: "REJECTED",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
          {
            eventTypeId: 1,
            userId: 101,
            status: "CANCELLED",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus2DateString}T05:00:00.000Z`,
            endTime: `${plus2DateString}T05:15:00.000Z`,
          },
          {
            eventTypeId: 1,
            userId: 101,
            status: "PENDING",
            // Booking Time is stored in GMT in DB. So, provide entry in GMT only.
            startTime: `${plus2DateString}T06:00:00.000Z`,
            endTime: `${plus2DateString}T06:15:00.000Z`,
          },
        ],
      });

      // Day Plus 2 is completely free - It only has non accepted bookings
      const scheduleOnCompletelyFreeDay = await getSchedule({
        input: {
          eventTypeId: 1,
          // EventTypeSlug doesn't matter for non-dynamic events
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      // getSchedule returns timeslots in GMT
      expect(scheduleOnCompletelyFreeDay).toHaveTimeSlots(
        [
          "04:00:00.000Z",
          "04:45:00.000Z",
          "05:30:00.000Z",
          "06:15:00.000Z",
          "07:00:00.000Z",
          "07:45:00.000Z",
          "08:30:00.000Z",
          "09:15:00.000Z",
          "10:00:00.000Z",
          "10:45:00.000Z",
          "11:30:00.000Z",
        ],
        {
          dateString: plus2DateString,
        }
      );

      // Day plus 3
      const scheduleForDayWithOneBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(scheduleForDayWithOneBooking).toHaveTimeSlots(
        [
          // "04:00:00.000Z", - This slot is unavailable because of the booking from 4:00 to 4:15
          `04:15:00.000Z`,
          `05:00:00.000Z`,
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        {
          dateString: plus3DateString,
        }
      );
    });

    test("slots are available as per `length`, `slotInterval` of the event", async () => {
      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            length: 30,
            users: [
              {
                id: 101,
              },
            ],
          },
          {
            id: 2,
            length: 30,
            slotInterval: 120,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
      });
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const scheduleForEventWith30Length = await getSchedule({
        input: {
          orgSlug: null,
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });

      expect(scheduleForEventWith30Length).toHaveTimeSlots(
        [
          `04:00:00.000Z`,
          `04:30:00.000Z`,
          `05:00:00.000Z`,
          `05:30:00.000Z`,
          `06:00:00.000Z`,
          `06:30:00.000Z`,
          `07:00:00.000Z`,
          `07:30:00.000Z`,
          `08:00:00.000Z`,
          `08:30:00.000Z`,
          `09:00:00.000Z`,
          `09:30:00.000Z`,
          `10:00:00.000Z`,
          `10:30:00.000Z`,
          `11:00:00.000Z`,
          `11:30:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );

      const scheduleForEventWith30minsLengthAndSlotInterval2hrs = await getSchedule({
        input: {
          orgSlug: null,
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
        },
      });
      // `slotInterval` takes precedence over `length`
      // 4:30 is utc so it is 10:00 in IST
      expect(scheduleForEventWith30minsLengthAndSlotInterval2hrs).toHaveTimeSlots(
        [`04:30:00.000Z`, `06:30:00.000Z`, `08:30:00.000Z`, `10:30:00.000Z`, `12:30:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("minimumBookingNotice is respected", async () => {
      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            length: 2 * 60,
            minimumBookingNotice: 13 * 60, // Would take the minimum bookable time to be 18:30UTC+13 = 7:30AM UTC
            users: [
              {
                id: 101,
              },
            ],
          },
          {
            id: 2,
            length: 2 * 60,
            minimumBookingNotice: 10 * 60, // Would take the minimum bookable time to be 18:30UTC+10 = 4:30AM UTC
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
      });

      const { dateString: todayDateString } = getDate();
      const { dateString: minus1DateString } = getDate({ dateIncrement: -1 });

      // Time Travel to the beginning of today after getting all the dates correctly.
      timeTravelToTheBeginningOfToday({ utcOffsetInHours: 5.5 });

      const scheduleForEventWithBookingNotice13Hrs = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${minus1DateString}T18:30:00.000Z`,
          endTime: `${todayDateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(scheduleForEventWithBookingNotice13Hrs).toHaveTimeSlots(
        [
          /*`04:00:00.000Z`, `06:00:00.000Z`, - Minimum time slot is 07:30 UTC which is 13hrs from 18:30*/
          `08:00:00.000Z`,
          `10:00:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: todayDateString,
        }
      );

      const scheduleForEventWithBookingNotice10Hrs = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${minus1DateString}T18:30:00.000Z`,
          endTime: `${todayDateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });
      expect(scheduleForEventWithBookingNotice10Hrs).toHaveTimeSlots(
        [
          /*`04:00:00.000Z`, - Minimum bookable time slot is 04:30 UTC which is 10hrs from 18:30 */
          `05:00:00.000Z`,
          `07:00:00.000Z`,
          `09:00:00.000Z`,
        ],
        {
          dateString: todayDateString,
        }
      );
    });

    test("afterBuffer and beforeBuffer tests - Non Cal Busy Time", async () => {
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([
        {
          start: `${plus3DateString}T04:00:00.000Z`,
          end: `${plus3DateString}T05:59:59.000Z`,
        },
      ]);

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 120,
            beforeEventBuffer: 120,
            afterEventBuffer: 120,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps["google-calendar"]],
      };

      await createBookingScenario(scenarioData);

      const scheduleForEventOnADayWithNonCalBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(scheduleForEventOnADayWithNonCalBooking).toHaveTimeSlots(
        [
          // `04:00:00.000Z`, // - 4 AM is booked
          // `06:00:00.000Z`, // - 6 AM is not available because 08:00AM slot has a `beforeEventBuffer`
          `08:00:00.000Z`, // - 8 AM is available because of availability of 06:00 - 07:59
          `10:00:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: plus3DateString,
        }
      );
    });

    test("afterBuffer and beforeBuffer tests - Cal Busy Time", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([
        {
          start: `${plus3DateString}T04:00:00.000Z`,
          end: `${plus3DateString}T05:59:59.000Z`,
        },
      ]);

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 120,
            beforeEventBuffer: 120,
            afterEventBuffer: 120,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T05:59:59.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
        ],
        apps: [TestData.apps["google-calendar"]],
      };

      await createBookingScenario(scenarioData);

      const scheduleForEventOnADayWithCalBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(scheduleForEventOnADayWithCalBooking).toHaveTimeSlots(
        [
          // `04:00:00.000Z`, // - 4 AM is booked
          // `06:00:00.000Z`, // - 6 AM is not available because of afterBuffer(120 mins) of the existing booking(4-5:59AM slot)
          // `08:00:00.000Z`, // - 8 AM is not available because of beforeBuffer(120mins) of possible booking at 08:00
          `10:00:00.000Z`,
          `12:00:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("Start times are offset (offsetStart)", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([]);

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 25,
            offsetStart: 5,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps["google-calendar"]],
      };

      await createBookingScenario(scenarioData);

      const schedule = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(schedule).toHaveTimeSlots(
        [
          `04:05:00.000Z`,
          `04:35:00.000Z`,
          `05:05:00.000Z`,
          `05:35:00.000Z`,
          `06:05:00.000Z`,
          `06:35:00.000Z`,
          `07:05:00.000Z`,
          `07:35:00.000Z`,
          `08:05:00.000Z`,
          `08:35:00.000Z`,
          `09:05:00.000Z`,
          `09:35:00.000Z`,
          `10:05:00.000Z`,
          `10:35:00.000Z`,
          `11:05:00.000Z`,
          `11:35:00.000Z`,
          `12:05:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("Check for Date overrides", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 60,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHoursWithDateOverride(plus2DateString)],
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const scheduleForEventOnADayWithDateOverride = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(scheduleForEventOnADayWithDateOverride).toHaveTimeSlots(
        ["08:30:00.000Z", "09:30:00.000Z", "10:30:00.000Z", "11:30:00.000Z"],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("that a user is considered busy when there's a booking they host", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      await createBookingScenario({
        eventTypes: [
          // A Collective Event Type hosted by this user
          {
            id: 1,
            slotInterval: 45,
            schedulingType: "COLLECTIVE",
            hosts: [
              {
                userId: 101,
              },
              {
                userId: 102,
              },
            ],
          },
          // A default Event Type which this user owns
          {
            id: 2,
            length: 15,
            slotInterval: 45,
            users: [{ id: 101 }],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
          {
            ...TestData.users.example,
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          // Create a booking on our Collective Event Type
          {
            userId: 101,
            attendees: [
              {
                email: "IntegrationTestUser102@example.com",
              },
            ],
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
        ],
      });

      // Requesting this user's availability for their
      // individual Event Type
      const thisUserAvailability = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(thisUserAvailability).toHaveTimeSlots(
        [
          // `04:00:00.000Z`, // <- This slot should be occupied by the Collective Event
          `04:15:00.000Z`,
          `05:00:00.000Z`,
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("test that booking limit is working correctly if user is all day available", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            bookingLimits: {
              PER_DAY: 1,
            },
            users: [
              {
                id: 101,
              },
            ],
          },
          {
            id: 2,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            bookingLimits: {
              PER_DAY: 2,
            },
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "All Day available",
                availability: [
                  {
                    userId: null,
                    eventTypeId: null,
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T00:00:00.000Z"),
                    endTime: new Date("1970-01-01T23:59:59.999Z"),
                    date: null,
                  },
                ],
                timeZone: Timezones["+6:00"],
              },
            ],
          },
        ],
        // One bookings for each(E1 and E2) on plus2Date
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            startTime: `${plus2DateString}T08:00:00.000Z`,
            endTime: `${plus2DateString}T09:00:00.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
          {
            userId: 101,
            eventTypeId: 2,
            startTime: `${plus2DateString}T08:00:00.000Z`,
            endTime: `${plus2DateString}T09:00:00.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const thisUserAvailabilityBookingLimitOne = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["+6:00"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      const thisUserAvailabilityBookingLimitTwo = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["+6:00"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      let availableSlotsInTz: dayjs.Dayjs[] = [];
      for (const date in thisUserAvailabilityBookingLimitOne.slots) {
        thisUserAvailabilityBookingLimitOne.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }

      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(0); // 1 booking per day as limit

      availableSlotsInTz = [];
      for (const date in thisUserAvailabilityBookingLimitTwo.slots) {
        thisUserAvailabilityBookingLimitTwo.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }
      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(23); // 2 booking per day as limit, only one booking on that
    });

    test("test that booking limit is working correctly if user is all day available and attendee is in different timezone than host", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            bookingLimits: {
              PER_DAY: 1,
            },
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "All Day available",
                availability: [
                  {
                    userId: null,
                    eventTypeId: null,
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T00:00:00.000Z"),
                    endTime: new Date("1970-01-01T23:59:59.999Z"),
                    date: null,
                  },
                ],
                timeZone: Timezones["+6:00"],
              },
            ],
          },
        ],
        // One bookings for each(E1 and E2) on plus2Date
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            startTime: `${plus2DateString}T08:00:00.000Z`,
            endTime: `${plus2DateString}T09:00:00.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const thisUserAvailabilityBookingLimit = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["-11:00"], //attendee timezone
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      const availableSlotsInTz: dayjs.Dayjs[] = [];
      for (const date in thisUserAvailabilityBookingLimit.slots) {
        thisUserAvailabilityBookingLimit.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }

      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(0); // 1 booking per day as limit
    });

    test("global team booking limit block slot if one fixed host reached limit", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            team: {
              id: 1,
              bookingLimits: { PER_DAY: 1 },
            },
            schedulingType: SchedulingType.COLLECTIVE,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
          },
          {
            id: 2,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            team: {
              id: 1,
              bookingLimits: { PER_DAY: 1 },
            },
            schedulingType: SchedulingType.COLLECTIVE,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
          },
          {
            id: 3,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            users: [
              {
                id: 101,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "All Day available",
                availability: [
                  {
                    userId: null,
                    eventTypeId: null,
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T00:00:00.000Z"),
                    endTime: new Date("1970-01-01T23:59:59.999Z"),
                    date: null,
                  },
                ],
                timeZone: Timezones["+6:00"],
              },
            ],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            startTime: `${plus2DateString}T08:00:00.000Z`,
            endTime: `${plus2DateString}T09:00:00.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const availabilityEventTypeOne = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["+6:00"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      const availableSlotsInTz: dayjs.Dayjs[] = [];
      for (const date in availabilityEventTypeOne.slots) {
        availabilityEventTypeOne.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }

      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(0); // 1 booking per day as limit

      const availabilityEventTypeTwo = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["+6:00"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      for (const date in availabilityEventTypeTwo.slots) {
        availabilityEventTypeTwo.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }

      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(0); // 1 booking per day as limit

      const availabilityUserEventType = await getSchedule({
        input: {
          eventTypeId: 3,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["+6:00"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      for (const date in availabilityUserEventType.slots) {
        availabilityUserEventType.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }

      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(23);
    });

    test("global team booking limit blocks correct slots if attendee and host are in different timezone", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      const scenarioData = {
        eventTypes: [
          {
            id: 1,
            length: 60,
            beforeEventBuffer: 0,
            afterEventBuffer: 0,
            team: {
              id: 1,
              bookingLimits: { PER_DAY: 1 },
            },
            schedulingType: SchedulingType.COLLECTIVE,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "All Day available",
                availability: [
                  {
                    userId: null,
                    eventTypeId: null,
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T00:00:00.000Z"),
                    endTime: new Date("1970-01-01T23:59:59.999Z"),
                    date: null,
                  },
                ],
                timeZone: Timezones["+6:00"],
              },
            ],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            startTime: `${plus2DateString}T08:00:00.000Z`,
            endTime: `${plus2DateString}T09:00:00.000Z`,
            status: "ACCEPTED" as BookingStatus,
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const thisUserAvailabilityBookingLimit = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T00:00:00.000Z`,
          endTime: `${plus3DateString}T23:59:59.999Z`,
          timeZone: Timezones["-11:00"], // attendee timezone
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      const availableSlotsInTz: dayjs.Dayjs[] = [];
      for (const date in thisUserAvailabilityBookingLimit.slots) {
        thisUserAvailabilityBookingLimit.slots[date].forEach((timeObj) => {
          availableSlotsInTz.push(dayjs(timeObj.time).tz(Timezones["+6:00"]));
        });
      }

      expect(availableSlotsInTz.filter((slot) => slot.format().startsWith(plus2DateString)).length).toBe(0); // 1 booking per day as limit
    });

    test("a slot counts as being busy when the eventType is requiresConfirmation and requiresConfirmationWillBlockSlot", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      await createBookingScenario({
        eventTypes: [
          // A default Event Type which this user owns
          {
            id: 2,
            length: 15,
            slotInterval: 45,
            users: [{ id: 101 }],
            requiresConfirmation: true,
            requiresConfirmationWillBlockSlot: true,
          },
          {
            id: 3,
            length: 15,
            slotInterval: 45,
            users: [{ id: 101 }],
            requiresConfirmation: true,
            requiresConfirmationWillBlockSlot: false,
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          {
            userId: 101,
            attendees: [
              {
                email: "IntegrationTestUser102@example.com",
              },
            ],
            eventTypeId: 2,
            status: "PENDING",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
          {
            userId: 101,
            attendees: [
              {
                email: "IntegrationTestUser103@example.com",
              },
            ],
            eventTypeId: 3,
            status: "PENDING",
            startTime: `${plus2DateString}T05:00:00.000Z`,
            endTime: `${plus2DateString}T05:15:00.000Z`,
          },
        ],
      });

      // Requesting this user's availability for their
      // individual Event Type
      const thisUserAvailability = await getSchedule({
        input: {
          eventTypeId: 2,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: null,
        },
      });

      expect(thisUserAvailability).toHaveTimeSlots(
        [
          // `04:00:00.000Z`, // <- This slot should be occupied by the Pending Requires Confirmation booking blocking this slot
          `04:15:00.000Z`,
          `05:00:00.000Z`, // <- This slot should be availble to book as this event type (id: 3) has requires confirmation without blocking the slo
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        {
          dateString: plus2DateString,
        }
      );
    });
  });

  describe("Team Event", () => {
    test("correctly identifies unavailable slots from calendar for all users in collective scheduling, considers bookings of users in other events as well", async () => {
      const { dateString: todayDateString } = getDate();

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      await createBookingScenario({
        eventTypes: [
          // An event having two users with one accepted booking
          {
            id: 1,
            slotInterval: 45,
            schedulingType: "COLLECTIVE",
            length: 45,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
          },
          {
            id: 2,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 102,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
          {
            ...TestData.users.example,
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
          {
            userId: 102,
            eventTypeId: 2,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T05:30:00.000Z`,
            endTime: `${plus2DateString}T05:45:00.000Z`,
          },
        ],
      });

      const scheduleForTeamEventOnADayWithNoBooking = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${todayDateString}T18:30:00.000Z`,
          endTime: `${plus1DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      expect(scheduleForTeamEventOnADayWithNoBooking).toHaveTimeSlots(
        [
          `04:00:00.000Z`,
          `04:45:00.000Z`,
          `05:30:00.000Z`,
          `06:15:00.000Z`,
          `07:00:00.000Z`,
          `07:45:00.000Z`,
          `08:30:00.000Z`,
          `09:15:00.000Z`,
          `10:00:00.000Z`,
          `10:45:00.000Z`,
          `11:30:00.000Z`,
        ],
        {
          dateString: plus1DateString,
        }
      );

      const scheduleForTeamEventOnADayWithOneBookingForEachUser = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      // A user with blocked time in another event, still affects Team Event availability
      // It's a collective availability, so both user 101 and 102 are considered for timeslots
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUser).toHaveTimeSlots(
        [
          //`04:00:00.000Z`, - Blocked with User 101
          `04:15:00.000Z`,
          //`05:00:00.000Z`, - Blocked with User 102 in event 2
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        { dateString: plus2DateString }
      );
    });

    test("correctly identifies unavailable slots from calendar for all users in Round Robin scheduling, considers bookings of users in other events as well", async () => {
      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });

      await createBookingScenario({
        eventTypes: [
          // An event having two users with one accepted booking
          {
            id: 1,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 101,
              },
              {
                id: 102,
              },
            ],
            schedulingType: "ROUND_ROBIN",
          },
          {
            id: 2,
            slotInterval: 45,
            length: 45,
            users: [
              {
                id: 102,
              },
            ],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
          },
          {
            ...TestData.users.example,
            id: 102,
            schedules: [TestData.schedules.IstWorkHours],
          },
        ],
        bookings: [
          {
            userId: 101,
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
          {
            userId: 102,
            eventTypeId: 2,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T05:30:00.000Z`,
            endTime: `${plus2DateString}T05:45:00.000Z`,
          },
          {
            userId: 101,
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus3DateString}T04:00:00.000Z`,
            endTime: `${plus3DateString}T04:15:00.000Z`,
          },
          {
            userId: 102,
            eventTypeId: 2,
            status: "ACCEPTED",
            startTime: `${plus3DateString}T04:00:00.000Z`,
            endTime: `${plus3DateString}T04:15:00.000Z`,
          },
        ],
      });
      const scheduleForTeamEventOnADayWithOneBookingForEachUserButOnDifferentTimeslots = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          orgSlug: null,
        },
      });
      // A user with blocked time in another event, still affects Team Event availability
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUserButOnDifferentTimeslots).toHaveTimeSlots(
        [
          `04:00:00.000Z`, // - Blocked with User 101 but free with User 102. Being RoundRobin it is still bookable
          `04:45:00.000Z`,
          `05:30:00.000Z`, // - Blocked with User 102 but free with User 101. Being RoundRobin it is still bookable
          `06:15:00.000Z`,
          `07:00:00.000Z`,
          `07:45:00.000Z`,
          `08:30:00.000Z`,
          `09:15:00.000Z`,
          `10:00:00.000Z`,
          `10:45:00.000Z`,
          `11:30:00.000Z`,
        ],
        { dateString: plus2DateString }
      );

      const scheduleForTeamEventOnADayWithOneBookingForEachUserOnSameTimeSlot = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus2DateString}T18:30:00.000Z`,
          endTime: `${plus3DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          orgSlug: null,
        },
      });
      // A user with blocked time in another event, still affects Team Event availability
      expect(scheduleForTeamEventOnADayWithOneBookingForEachUserOnSameTimeSlot).toHaveTimeSlots(
        [
          //`04:00:00.000Z`, // - Blocked with User 101 as well as User 102, so not available in Round Robin
          `04:15:00.000Z`,
          `05:00:00.000Z`,
          `05:45:00.000Z`,
          `06:30:00.000Z`,
          `07:15:00.000Z`,
          `08:00:00.000Z`,
          `08:45:00.000Z`,
          `09:30:00.000Z`,
          `10:15:00.000Z`,
          `11:00:00.000Z`,
          `11:45:00.000Z`,
        ],
        { dateString: plus3DateString }
      );
    });

    test("getSchedule can get slots of org's member event type when orgSlug, eventTypeSlug passed as input", async () => {
      const org = await createOrganization({ name: "acme", slug: "acme" });

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        // So, that it picks the first schedule from the list
        defaultScheduleId: null,
        organizationId: org.id,
        // Has morning shift with some overlap with morning shift
        schedules: [TestData.schedules.IstWorkHours],
      });

      const scenario = await createBookingScenario(
        getScenarioData(
          {
            eventTypes: [
              {
                id: 1,
                slotInterval: 45,
                length: 45,
                userId: 101,
              },
            ],
            organizer,
          },
          { id: org.id }
        )
      );

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

      const getScheduleRes = await getSchedule({
        input: {
          eventTypeSlug: scenario.eventTypes[0]?.slug,
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: false,
          orgSlug: "acme",
          usernameList: [organizer.username],
        },
      });

      expect(getScheduleRes).toHaveTimeSlots(
        [
          `04:00:00.000Z`,
          `04:45:00.000Z`,
          `05:30:00.000Z`,
          `06:15:00.000Z`,
          `07:00:00.000Z`,
          `07:45:00.000Z`,
          `08:30:00.000Z`,
          `09:15:00.000Z`,
          `10:00:00.000Z`,
          `10:45:00.000Z`,
          `11:30:00.000Z`,
        ],
        { dateString: plus2DateString }
      );
    });
  });

  describe("Round robin event", async () => {
    test("correctly get slots for event with round robin hosts choosen schedule (non-default)", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      // An event with no common schedule and hosts choosen schedule (non-default schedule)
      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            hosts: [
              {
                userId: 101,
                isFixed: false,
                scheduleId: 2,
              },
              {
                userId: 102,
                isFixed: false,
                scheduleId: 3,
              },
            ],
            schedulingType: "ROUND_ROBIN",
            schedule: null,
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.IstMorningShift, TestData.schedules.IstEveningShift],
            defaultScheduleId: 1,
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstEveningShift, TestData.schedules.IstMorningShift],
            defaultScheduleId: 4,
          },
        ],
        bookings: [],
      });

      const scheduleWithHostChoosenSch = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          teamMemberEmail: "test@test.com",
        },
      });

      // expect only slots of IstEveningShift , as this is the choosen schedule for hosts
      expect(scheduleWithHostChoosenSch).toHaveTimeSlots(
        [`11:30:00.000Z`, `12:30:00.000Z`, `13:30:00.000Z`, `14:30:00.000Z`, `15:30:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );
    });
    test("correctly get slots for event with commom schedule", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      // An event with common schedule
      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedule: TestData.schedules.IstEveningShift,
            schedulingType: "ROUND_ROBIN",
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.IstMorningShift],
            defaultScheduleId: 1,
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstMidShift],
            defaultScheduleId: 2,
          },
        ],
        bookings: [],
      });

      const scheduleWithEventCommonSch = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          teamMemberEmail: "test@test.com",
        },
      });

      // expect only slots of IstEveningShift , as this is the common schedule of event
      expect(scheduleWithEventCommonSch).toHaveTimeSlots(
        [`11:30:00.000Z`, `12:30:00.000Z`, `13:30:00.000Z`, `14:30:00.000Z`, `15:30:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("Reschedule: should show timeslots of the same host if rescheduleWithSameRoundRobinHost is true", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      // An event with common schedule
      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            rescheduleWithSameRoundRobinHost: true,
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedulingType: "ROUND_ROBIN",
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.IstEveningShift],
            defaultScheduleId: 1,
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstMorningShift],
            defaultScheduleId: 2,
          },
        ],
        bookings: [
          {
            uid: "BOOKING_TO_RESCHEDULE_UID",
            userId: 101,
            attendees: [
              {
                email: "IntegrationTestUser102@example.com",
              },
            ],
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
        ],
      });

      const schedule = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
        },
      });

      // expect only slots of IstEveningShift as this is the slots for the original host of the booking
      expect(schedule).toHaveTimeSlots(
        [`11:30:00.000Z`, `12:30:00.000Z`, `13:30:00.000Z`, `14:30:00.000Z`, `15:30:00.000Z`],
        {
          dateString: plus2DateString,
        }
      );
    });

    test("Reschedule: should show timeslots as per routedTeamMemberIds(instead of same host) even if rescheduleWithSameRoundRobinHost is true but it is a rerouting scenario", async () => {
      vi.setSystemTime("2024-05-21T00:00:13Z");

      const plus1DateString = "2024-05-22";
      const plus2DateString = "2024-05-23";

      // An event with common schedule
      await createBookingScenario({
        eventTypes: [
          {
            id: 1,
            slotInterval: 60,
            length: 60,
            rescheduleWithSameRoundRobinHost: true,
            hosts: [
              {
                userId: 101,
                isFixed: false,
              },
              {
                userId: 102,
                isFixed: false,
              },
            ],
            schedulingType: "ROUND_ROBIN",
          },
        ],
        users: [
          {
            ...TestData.users.example,
            email: "example@example.com",
            id: 101,
            schedules: [TestData.schedules.IstEveningShift],
            defaultScheduleId: 1,
          },
          {
            ...TestData.users.example,
            email: "example1@example.com",
            id: 102,
            schedules: [TestData.schedules.IstMorningShift],
            defaultScheduleId: 2,
          },
        ],
        bookings: [
          {
            uid: "BOOKING_TO_RESCHEDULE_UID",
            userId: 101,
            attendees: [
              {
                email: "IntegrationTestUser102@example.com",
              },
            ],
            eventTypeId: 1,
            status: "ACCEPTED",
            startTime: `${plus2DateString}T04:00:00.000Z`,
            endTime: `${plus2DateString}T04:15:00.000Z`,
          },
        ],
      });

      const schedule = await getSchedule({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: `${plus1DateString}T18:30:00.000Z`,
          endTime: `${plus2DateString}T18:29:59.999Z`,
          timeZone: Timezones["+5:30"],
          isTeamEvent: true,
          rescheduleUid: "BOOKING_TO_RESCHEDULE_UID",
          routedTeamMemberIds: [102],
        },
      });

      // expect only slots of IstEveningShift as this is the slots for the original host of the booking
      expect(schedule).toHaveTimeSlots(
        expectedSlotsForSchedule.IstMorningShift.interval["1hr"].allPossibleSlotsStartingAt430,
        {
          dateString: plus2DateString,
        }
      );
    });
  });
});
