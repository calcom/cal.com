import type { ScenarioData } from "../../utils/bookingScenario/bookingScenario";
import {
  TestData,
  Timezones,
  getDate,
  createBookingScenario,
} from "../../utils/bookingScenario/bookingScenario";

import { describe, expect, vi, test } from "vitest";

import { PeriodType } from "@calcom/prisma/enums";
import { getAvailableSlots as getSchedule } from "@calcom/trpc/server/routers/viewer/slots/util";

import { expectedSlotsForSchedule } from "./expects";
import { setupAndTeardown } from "./setupAndTeardown";
import { timeTravelToTheBeginningOfToday } from "./utils";

function getPeriodTypeData({
  type,
  periodDays,
  periodCountCalendarDays,
  periodStartDate,
  periodEndDate,
}: {
  type: PeriodType;
  periodDays?: number;
  periodCountCalendarDays?: boolean;
  periodStartDate?: Date;
  periodEndDate?: Date;
}) {
  if (type === PeriodType.ROLLING) {
    if (!periodCountCalendarDays || !periodDays) {
      throw new Error("periodCountCalendarDays and periodDays are required for ROLLING period type");
    }
    return {
      periodType: PeriodType.ROLLING,
      periodDays,
      periodCountCalendarDays,
    };
  }

  if (type === PeriodType.ROLLING_WINDOW) {
    if (!periodCountCalendarDays || !periodDays) {
      throw new Error("periodCountCalendarDays and periodDays are required for ROLLING period type");
    }
    return {
      periodType: PeriodType.ROLLING_WINDOW,
      periodDays,
      periodCountCalendarDays,
    };
  }

  if (type === PeriodType.RANGE) {
    if (!periodStartDate || !periodEndDate) {
      throw new Error("periodStartDate and periodEndDate are required for RANGE period type");
    }
    return {
      periodType: PeriodType.RANGE,
      periodStartDate,
      periodEndDate,
    };
  }
}

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
  ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK: 61,
}));

describe("getSchedule", () => {
  setupAndTeardown();
  describe("Future Limits", () => {
    describe("PeriodType=ROLLING", () => {
      test("Basic test", async () => {
        const { dateString: yesterdayDateString } = getDate({ dateIncrement: -1 });
        const { dateString: todayDateString } = getDate();
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
        const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });
        const { dateString: plus4DateString } = getDate({ dateIncrement: 4 });
        const { dateString: plus5DateString } = getDate({ dateIncrement: 5 });
        timeTravelToTheBeginningOfToday({ utcOffsetInHours: 5.5 });

        const scenarioData = {
          eventTypes: [
            {
              id: 1,
              length: 60,
              ...getPeriodTypeData({
                type: "ROLLING",
                periodDays: 2,
                periodCountCalendarDays: true,
              }),
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
        } satisfies ScenarioData;

        await createBookingScenario(scenarioData);

        const scheduleForEvent = await getSchedule({
          input: {
            eventTypeId: 1,
            eventTypeSlug: "",
            usernameList: [],
            // Because this time is in GMT, it will be 00:00 in IST with todayDateString
            startTime: `${yesterdayDateString}T18:30:00.000Z`,
            endTime: `${plus5DateString}T18:29:59.999Z`,
            timeZone: Timezones["+5:30"],
            isTeamEvent: false,
          },
        });

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: todayDateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus1DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus2DateString,
            doExactMatch: true,
          }
        );

        // No Timeslots beyond plus2Date as that is beyond the rolling period
        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: plus3DateString,
        });

        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: plus4DateString,
        });
      });
    });

    describe("PeriodType=ROLLING_WINDOW", () => {
      test("Basic test", async () => {
        const { dateString: yesterdayDateString } = getDate({ dateIncrement: -1 });
        const { dateString: todayDateString } = getDate();
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
        const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });
        const { dateString: plus4DateString } = getDate({ dateIncrement: 4 });
        const { dateString: plus5DateString } = getDate({ dateIncrement: 5 });
        timeTravelToTheBeginningOfToday({ utcOffsetInHours: 5.5 });

        const scenarioData = {
          eventTypes: [
            {
              id: 1,
              length: 60,
              ...getPeriodTypeData({
                type: "ROLLING_WINDOW",
                periodDays: 3,
                periodCountCalendarDays: true,
              }),
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
            {
              userId: 101,
              eventTypeId: 1,
              status: "ACCEPTED",
              // Fully book plus2 Date
              startTime: `${plus1DateString}T18:30:00.000Z`,
              endTime: `${plus2DateString}T18:30:00.000Z`,
            },
          ],
        } satisfies ScenarioData;

        await createBookingScenario(scenarioData);

        const scheduleForEvent = await getSchedule({
          input: {
            eventTypeId: 1,
            eventTypeSlug: "",
            usernameList: [],
            // Because this time is in GMT, it will be 00:00 in IST with todayDateString
            startTime: `${yesterdayDateString}T18:30:00.000Z`,
            endTime: `${plus5DateString}T18:29:59.999Z`,
            timeZone: Timezones["+5:30"],
            isTeamEvent: false,
          },
        });

        console.log({ scheduleForEvent });
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: todayDateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus1DateString,
            doExactMatch: true,
          }
        );

        // plus2Date is fully booked. So, instead we will have timeslots one day later
        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: plus2DateString,
        });

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus3DateString,
            doExactMatch: true,
          }
        );

        // No Timeslots on plus4Date as beyond the rolling period
        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: plus4DateString,
        });
      });
    });

    describe("PeriodType=RANGE", () => {
      test("Basic test", async () => {
        const { dateString: yesterdayDateString } = getDate({ dateIncrement: -1 });
        const { dateString: todayDateString } = getDate();
        const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
        const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });
        const { dateString: plus3DateString } = getDate({ dateIncrement: 3 });
        const { dateString: plus4DateString } = getDate({ dateIncrement: 4 });
        const { dateString: plus5DateString } = getDate({ dateIncrement: 5 });
        timeTravelToTheBeginningOfToday({ utcOffsetInHours: 5.5 });

        const scenarioData = {
          eventTypes: [
            {
              id: 1,
              length: 60,
              // Makes today and tomorrow only available
              ...getPeriodTypeData({
                type: "RANGE",
                // dayPlus1InIst
                periodStartDate: new Date(`${todayDateString}T18:30:00.000Z`),
                // datePlus2InIst
                periodEndDate: new Date(`${plus1DateString}T18:30:00.000Z`),
                periodCountCalendarDays: true,
              }),
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
        } satisfies ScenarioData;

        await createBookingScenario(scenarioData);

        const scheduleForEvent = await getSchedule({
          input: {
            eventTypeId: 1,
            eventTypeSlug: "",
            usernameList: [],
            // Because this time is in GMT, it will be 00:00 in IST with todayDateString
            startTime: `${yesterdayDateString}T18:30:00.000Z`,
            endTime: `${plus5DateString}T18:29:59.999Z`,
            timeZone: Timezones["+5:30"],
            isTeamEvent: false,
          },
        });

        console.log({ scheduleForEvent });

        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: todayDateString,
        });

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus1DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus2DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: plus3DateString,
        });

        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: plus4DateString,
        });

        expect(scheduleForEvent).toHaveNoTimeSlots({
          dateString: plus4DateString,
        });
      });
    });
  });
});
