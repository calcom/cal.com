/**
 * How to ensure that unmocked prisma queries aren't called?
 */
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, expect, beforeEach } from "vitest";

import { test } from "@calcom/web/test/fixtures/fixtures";
import {
  createBookingScenario,
  getDate,
  getGoogleCalendarCredential,
  TestData,
} from "@calcom/web/test/lib/createBookingScenario";

import appStoreMock from "../../../../tests/libs/__mocks__/app-store";
import i18nMock from "../../../../tests/libs/__mocks__/libServerI18n";
import prismaMock from "../../../../tests/libs/__mocks__/prisma";
import reminderSchedulerMock from "../../../../tests/libs/__mocks__/reminderScheduler";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;
expect.extend({
  toHaveSentEmail(received, expected) {
    const { isNot } = this;
    return {
      // do not alter your "pass" based on isNot. Vitest does it for you
      pass: received === "foo",
      message: () => `${received} is${isNot ? " not" : ""} foo`,
    };
  },
});
describe("handleNewBooking", () => {
  beforeEach(() => {
    mockNoTranslations();
    mockEnableEmailFeature();
  });

  describe("Frontend:", () => {
    test(`should create a successful booking with Cal Video(Daily Video) if no explicit location is provided
    1. Should send emails to the booker as well as organizer
    `, async ({ emails }) => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const booker = {
        email: "booker@booker.org",
        name: "Booker",
      };
      const organizer = TestData.users.example;
      const { req } = createMockNextJsRequest({
        method: "POST",
        body: {
          responses: {
            email: booker.email,
            name: booker.name,
            location: { optionValue: "", value: "integrations:daily" },
          },
          start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
          end: `${getDate({ dateIncrement: 1 }).dateString}T04:30:00.000Z`,
          eventTypeId: 1,
          eventTypeSlug: "no-confirmation",
          timeZone: "Asia/Calcutta",
          language: "en",
          bookingUid: "bvCmP5rSquAazGSA7hz7ZP",
          user: "teampro",
          metadata: {},
          hasHashedBookingLink: false,
          hashedLink: null,
        },
      });

      const scenarioData = {
        hosts: [],
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
            ...organizer,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps.googleCalendar, TestData.apps.dailyVideo],
      };

      mockDailyVideoToCreateSuccessfulMeeting();

      // const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      // mockBusyCalendarTimes([
      //   {
      //     start: `${plus2DateString}T04:45:00.000Z`,
      //     end: `${plus2DateString}T23:00:00.000Z`,
      //   },
      // ]);

      createBookingScenario(scenarioData);

      const createdBooking = await handleNewBooking(req);
      expect(createdBooking.responses).toContain({
        email: booker.email,
        name: booker.name,
      });

      expect(createdBooking).toContain({
        location: "integrations:daily",
      });

      // TODO: Verify in workflows related tables @carina
      expect(reminderSchedulerMock.scheduleWorkflowReminders.mock.lastCall?.[0]).toContain({
        smsReminderNumber: null,
        hideBranding: false,
        isFirstRecurringEvent: true,
        isRescheduleEvent: false,
        isNotConfirmed: false,
      });

      const testEmails = emails.get();

      expect(testEmails[0]).toContain({
        to: `${organizer.email}`,
      });

      // TODO: Get the email HTML as DOM, so that we can get the title directly
      expect(testEmails[0].html).toContain("<title>confirmed_event_type_subject</title>");

      expect(testEmails[1]).toContain({
        to: `${booker.name} <${booker.email}>`,
      });
      expect(testEmails[1].html).toContain("<title>confirmed_event_type_subject</title>");
    });
  });
});

function mockNoTranslations() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  i18nMock.getTranslation.mockImplementation(() => {
    return new Promise((resolve) => {
      const identityFn = (key: string) => key;
      resolve(identityFn);
    });
  });
}

function mockDailyVideoToCreateSuccessfulMeeting() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  appStoreMock.appStore.dailyvideo.mockResolvedValue(() => {
    return new Promise((resolve) => {
      resolve({
        lib: {
          VideoApiAdapter: () => ({
            createMeeting: () => {
              return Promise.resolve({
                type: "daily_video",
                id: "dailyEventName",
                password: "dailyvideopass",
                url: "http://dailyvideo.example.com",
              });
            },
          }),
        },
      });
    });
  });
}

function mockEnableEmailFeature() {
  prismaMock.feature.findMany.mockResolvedValue([
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    {
      slug: "emails",
      // It's a kill switch
      enabled: false,
    },
  ]);
}

function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}
