// eslint-disable-next-line @typescript-eslint/no-var-requires
// const mock = require('mock-require');
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const fs = require('fs')
// const originalReadFileSync = fs.readFileSync
// const originalExistsSync = fs.existsSync
// mock('fs', {
// 	...fs,
// 	existsSync: function (fileName){
// 		if (fileName.includes('next-i18next.config.js')) {
// 			return true
// 		}
// 		return originalExistsSync.apply(this, [].slice.call(arguments))
// 	},
// 	readFileSync: function (){
// 		console.log(arguments)
// 		return originalReadFileSync.apply(this, [].slice.call(arguments))
// 	}
// })
// mock(path.resolve('next-i18next.config.js'), )
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, expect, vi, beforeEach } from "vitest";

import CalendarManagerMock from "../../../../tests/libs/__mocks__/CalendarManager";
import prismaMock from "../../../../tests/libs/__mocks__/prisma";
import reminderSchedulerMock from "../../../../tests/libs/__mocks__/reminderScheduler";
import { createBookingScenario, getDate, getGoogleCalendarCredential, TestData } from "./getSchedule.test";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: () => {
    return (key: string) => key;
  },
}));

vi.mock("@calcom/app-store", () => ({
  default: {
    dailyvideo: () => {
      return new Promise((resolve, reject) => {
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
    },
  },
}));

function enableEmailFeature() {
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

describe("handleNewBooking", () => {
  beforeEach(() => {
    global.E2E_EMAILS = [];
  });
  describe("Called by Frontend", () => {
    test("should create a successful booking", async () => {
      enableEmailFeature();
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          responses: {
            email: "d@e.com",
            name: "d",
            location: { optionValue: "", value: "integrations:daily" },
          },
          start: "2023-06-06T04:15:00Z",
          end: "2023-06-06T04:30:00Z",
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

      const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
      CalendarManagerMock.getBusyCalendarTimes.mockResolvedValue([
        {
          start: `${plus2DateString}T04:45:00.000Z`,
          end: `${plus2DateString}T23:00:00.000Z`,
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      prismaMock.booking.create.mockImplementation(function (booking) {
        return booking.data;
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
            ...TestData.users.example,
            id: 101,
            schedules: [TestData.schedules.IstWorkHours],
            credentials: [getGoogleCalendarCredential()],
            selectedCalendars: [TestData.selectedCalendars.google],
          },
        ],
        apps: [TestData.apps.googleCalendar],
      };
      createBookingScenario(scenarioData);

      const createdBooking = await handleNewBooking(req);
      expect(createdBooking.responses).toContain({
        email: "d@e.com",
        name: "d",
      });

      expect(createdBooking).toContain({
        location: "integrations:daily",
      });

      // TODO: Verify in workflows related tables @carina
      expect(reminderSchedulerMock.scheduleWorkflowReminders.mock.lastCall?.[0]).toContain({
        workflows: undefined,
        smsReminderNumber: null,
        hideBranding: false,
        isFirstRecurringEvent: true,
        isRescheduleEvent: false,
        requiresConfirmation: false,
      });
      console.log(global.E2E_EMAILS);
      expect(global.E2E_EMAILS).toHaveLength(2);
    });
  });
});
