import {
  TestData,
  Timezones,
  createBookingScenario,
  replaceDates,
} from "../../utils/bookingScenario/bookingScenario";
import type { ScenarioData } from "../../utils/bookingScenario/bookingScenario";

import { describe, expect, vi, test } from "vitest";

import { PeriodType } from "@calcom/prisma/enums";
import { getAvailableSlots as getSchedule } from "@calcom/trpc/server/routers/viewer/slots/util";

import { expectedSlotsForSchedule } from "./expects";
import { setupAndTeardown } from "./setupAndTeardown";

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
    if (periodCountCalendarDays === undefined || !periodDays) {
      throw new Error("periodCountCalendarDays and periodDays are required for ROLLING period type");
    }
    return {
      periodType: PeriodType.ROLLING,
      periodDays,
      periodCountCalendarDays,
    };
  }

  if (type === PeriodType.ROLLING_WINDOW) {
    if (periodCountCalendarDays === undefined || !periodDays) {
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
      test("When the time of the first slot of current day hasn't reached", async () => {
        // In IST timezone, it is 2024-05-31T07:00:00
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        const plus1DateString = "2024-06-01";
        const plus2DateString = "2024-06-02";
        const plus3DateString = "2024-06-03";
        const plus4DateString = "2024-06-04";
        const plus5DateString = "2024-06-05";

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
          // All slots on current day are available
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
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus3DateString,
        });

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus4DateString,
        });
      });

      test("When the time of the last slot of current day has passed", async () => {
        // In IST timezone, it is 2024-05-31T07:00:00
        vi.setSystemTime("2024-05-31T11:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        const plus1DateString = "2024-06-01";
        const plus2DateString = "2024-06-02";
        const plus3DateString = "2024-06-03";
        const plus4DateString = "2024-06-04";
        const plus5DateString = "2024-06-05";

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

        // No timeslots of current day available
        expect(scheduleForEvent).toHaveDateDisabled({
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

        // No Timeslots beyond plus2Date as that is beyond the rolling period
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus3DateString,
        });

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus4DateString,
        });
      });

      test("When the first timeslot of current day has passed", async () => {
        // In IST timezone, it is 2024-05-31T10:00:00
        vi.setSystemTime("2024-05-31T04:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        const plus1DateString = "2024-06-01";
        const plus2DateString = "2024-06-02";
        const plus3DateString = "2024-06-03";
        const plus4DateString = "2024-06-04";
        const plus5DateString = "2024-06-05";

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

        // No timeslots of current day available
        expect(scheduleForEvent).toHaveTimeSlots(
          // First timeslot not available
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430.slice(1),
          {
            doExactMatch: true,
            dateString: todayDateString,
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
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus3DateString,
        });

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus4DateString,
        });
      });

      test("When the time of the first slot of current day hasn't reached and there is a day fully booked in between. Also, we are counting only business days.", async () => {
        // In IST timezone, it is 2024-05-31T07:00:00
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const yesterdayDateString = "2024-05-30";
        // Friday
        const todayDateString = "2024-05-31";
        // Saturday
        const plus1DateString = "2024-06-01";
        // Sunday
        const plus2DateString = "2024-06-02";
        // Monday
        const plus3DateString = "2024-06-03";
        // Tuesday
        const plus4DateString = "2024-06-04";
        // Wednesday
        const plus5DateString = "2024-06-05";

        const scenarioData = {
          eventTypes: [
            {
              id: 1,
              length: 60,
              ...getPeriodTypeData({
                type: "ROLLING",
                periodDays: 2,
                periodCountCalendarDays: false,
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
          // All slots on current day are available
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: todayDateString,
            doExactMatch: true,
          }
        );

        // Being a Saturday, plus1Date is available as per Availability but not counted in periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus1DateString,
            doExactMatch: true,
          }
        );

        // Being a Saturday, plus2Date is available as per Availability but not counted in periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus2DateString,
            doExactMatch: true,
          }
        );

        // Day1 of periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus3DateString,
            doExactMatch: true,
          }
        );

        // Day2 of periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus4DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus5DateString,
        });
      });

      describe("Borderline cases", () => {
        test("When it is the very first second of the day", async () => {
          // In IST timezone, it is 2024-05-31T00:00:00
          vi.setSystemTime("2024-05-30T18:30:00Z");
          const yesterdayDateString = "2024-05-30";
          const todayDateString = "2024-05-31";
          const plus1DateString = "2024-06-01";
          const plus2DateString = "2024-06-02";
          const plus3DateString = "2024-06-03";
          const plus4DateString = "2024-06-04";
          const plus5DateString = "2024-06-05";

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

          console.log({ scheduleForEvent });

          expect(scheduleForEvent).toHaveTimeSlots(
            // All slots on current day are available
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
          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus3DateString,
          });

          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus4DateString,
          });
        });

        test("When it is the very last second of the day", async () => {
          // In IST timezone, it is 2024-05-31T23:59:00
          vi.setSystemTime("2024-05-31T18:29:00Z");
          const yesterdayDateString = "2024-05-30";
          const todayDateString = "2024-05-31";
          const plus1DateString = "2024-06-01";
          const plus2DateString = "2024-06-02";
          const plus3DateString = "2024-06-03";
          const plus4DateString = "2024-06-04";
          const plus5DateString = "2024-06-05";

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

          expect(scheduleForEvent).toHaveDateDisabled({
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

          // No Timeslots beyond plus2Date as that is beyond the rolling period
          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus3DateString,
          });

          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus4DateString,
          });
        });
      });

      describe("GMT-11 Browsing", () => {
        test("When the time of the first slot of current day hasn't reached", async () => {
          // In IST timezone, it is 2024-05-31T07:00:00
          vi.setSystemTime("2024-05-31T01:30:00Z");
          const yesterdayDateString = "2024-05-30";
          const todayDateString = "2024-05-31";
          const plus1DateString = "2024-06-01";
          const plus2DateString = "2024-06-02";
          const plus3DateString = "2024-06-03";
          const plus5DateString = "2024-06-05";

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
              timeZone: Timezones["-11:00"],
              isTeamEvent: false,
            },
          });

          const allTimeSlotsForToday = [
            "2024-05-31T11:30:00.000Z",
            "2024-06-01T04:30:00.000Z",
            "2024-06-01T05:30:00.000Z",
            "2024-06-01T06:30:00.000Z",
            "2024-06-01T07:30:00.000Z",
            "2024-06-01T08:30:00.000Z",
            "2024-06-01T09:30:00.000Z",
            "2024-06-01T10:30:00.000Z",
          ];

          expect(scheduleForEvent).toHaveTimeSlots(
            // All slots on current day are available
            [
              // "2024-05-30T04:30:00.000Z", // Not available as before the start of the range
              "2024-05-31T04:30:00.000Z",
              "2024-05-31T05:30:00.000Z",
              "2024-05-31T06:30:00.000Z",
              "2024-05-31T07:30:00.000Z",
              "2024-05-31T08:30:00.000Z",
              "2024-05-31T09:30:00.000Z",
              "2024-05-31T10:30:00.000Z",
            ],
            {
              dateString: yesterdayDateString,
              doExactMatch: true,
            }
          );

          expect(scheduleForEvent).toHaveTimeSlots(
            // All slots on current day are available
            allTimeSlotsForToday,
            {
              dateString: todayDateString,
              doExactMatch: true,
            }
          );

          expect(scheduleForEvent).toHaveTimeSlots(
            replaceDates(allTimeSlotsForToday, {
              "2024-05-31": "2024-06-01",
              "2024-06-01": "2024-06-02",
            }),
            {
              dateString: plus1DateString,
              doExactMatch: true,
            }
          );

          //No Timeslots beyond plus2Date as that is beyond the rolling period
          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus2DateString,
          });

          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus3DateString,
          });
        });
      });
    });

    describe("PeriodType=ROLLING_WINDOW", () => {
      test("When the time of the first slot of current day hasn't reached and there is a day fully booked in between. It makes `periodDays` available", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        const plus1DateString = "2024-06-01";
        const plus2DateString = "2024-06-02";
        const plus3DateString = "2024-06-03";
        const plus4DateString = "2024-06-04";
        const plus5DateString = "2024-06-05";

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
        expect(scheduleForEvent).toHaveDateDisabled({
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
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus4DateString,
        });
      });

      test("When the time of the last slot of current day has passed and there is a day fully booked in between. It makes `periodDays` available", async () => {
        // In IST timezone, it is 2024-05-31T07:00:00
        vi.setSystemTime("2024-05-31T11:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        const plus1DateString = "2024-06-01";
        const plus2DateString = "2024-06-02";
        const plus3DateString = "2024-06-03";
        const plus4DateString = "2024-06-04";
        const plus5DateString = "2024-06-05";

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

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: todayDateString,
        });

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus1DateString,
            doExactMatch: true,
          }
        );

        // plus2Date is fully booked. So, instead we will have timeslots one day later
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus2DateString,
        });

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus3DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus4DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus5DateString,
        });
      });

      test("When the first timeslot of current day has passed and there is a day fully booked in between. It makes `periodDays` available", async () => {
        // In IST timezone, it is 2024-05-31T10:00
        vi.setSystemTime("2024-05-31T04:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        const plus1DateString = "2024-06-01";
        const plus2DateString = "2024-06-02";
        const plus3DateString = "2024-06-03";
        const plus4DateString = "2024-06-04";
        const plus5DateString = "2024-06-05";

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

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430.slice(1),
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
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus2DateString,
        });

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus3DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus4DateString,
        });

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus5DateString,
        });
      });

      test("When the time of the first slot of current day hasn't reached and there is a day fully booked in between. Also, we are counting only business days. It makes weekends + `periodDays` available", async () => {
        // In Ist timezone, it is 2024-05-31T01:30:00 which is a Friday
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        // Saturday
        const plus1DateString = "2024-06-01";
        // Sunday
        const plus2DateString = "2024-06-02";
        // Monday
        const plus3DateString = "2024-06-03";
        // Tuesday
        const plus4DateString = "2024-06-04";
        // Wednesday
        const plus5DateString = "2024-06-05";
        // Thursday
        const plus6DateString = "2024-06-06";

        const scenarioData = {
          eventTypes: [
            {
              id: 1,
              length: 60,
              ...getPeriodTypeData({
                type: "ROLLING_WINDOW",
                periodDays: 3,
                periodCountCalendarDays: false,
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
              // Fully book plus3 Date
              startTime: `${plus2DateString}T18:30:00.000Z`,
              endTime: `${plus3DateString}T18:30:00.000Z`,
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

        // Day1 of periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: todayDateString,
            doExactMatch: true,
          }
        );

        // plus1Date is a Saturday and available as per Availability but not counted in periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus1DateString,
            doExactMatch: true,
          }
        );

        // plus2Date is a Sunday and available as per Availability but not counted in periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus2DateString,
            doExactMatch: true,
          }
        );

        // plus3Date is fully booked. So, instead we will have timeslots one day later
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus3DateString,
        });

        // Day2 of periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus4DateString,
            doExactMatch: true,
          }
        );

        // Day3 of periodDays
        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus5DateString,
            doExactMatch: true,
          }
        );

        // Beyond periodDays
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus6DateString,
        });
      });

      describe("Borderline cases", () => {
        test("When it is the very first second of the day", async () => {
          // In IST timezone, it is 2024-05-31T00:00
          vi.setSystemTime("2024-05-30T18:30:00Z");
          const yesterdayDateString = "2024-05-30";
          const todayDateString = "2024-05-31";
          const plus1DateString = "2024-06-01";
          const plus2DateString = "2024-06-02";
          const plus3DateString = "2024-06-03";
          const plus4DateString = "2024-06-04";
          const plus5DateString = "2024-06-05";

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
          expect(scheduleForEvent).toHaveDateDisabled({
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
          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus4DateString,
          });
        });
        test("When it is the very last second of the day", async () => {
          // In IST timezone, it is 2024-05-31T23:59
          vi.setSystemTime("2024-05-31T18:29:00Z");
          const yesterdayDateString = "2024-05-30";
          const todayDateString = "2024-05-31";
          const plus1DateString = "2024-06-01";
          const plus2DateString = "2024-06-02";
          const plus3DateString = "2024-06-03";
          const plus4DateString = "2024-06-04";
          const plus5DateString = "2024-06-05";

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

          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: todayDateString,
          });

          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            {
              dateString: plus1DateString,
              doExactMatch: true,
            }
          );

          // plus2Date is fully booked. So, instead we will have timeslots one day later
          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus2DateString,
          });

          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            {
              dateString: plus3DateString,
              doExactMatch: true,
            }
          );

          expect(scheduleForEvent).toHaveTimeSlots(
            expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
            {
              dateString: plus4DateString,
              doExactMatch: true,
            }
          );

          expect(scheduleForEvent).toHaveDateDisabled({
            dateString: plus5DateString,
          });
        });
      });

      test("When the time of the first slot of current day hasn't reached and there is a day fully booked in between. Also, weekend availability is not there and one of the days is on a weekend. It makes `periodDays` available", async () => {
        // In Ist timezone, it is 2024-05-31T01:30:00 which is a Friday
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        // Saturday
        const plus1DateString = "2024-06-01";
        // Sunday
        const plus2DateString = "2024-06-02";
        // Monday
        const plus3DateString = "2024-06-03";
        // Tuesday
        const plus4DateString = "2024-06-04";
        // Wednesday
        const plus5DateString = "2024-06-05";
        // Thursday
        const plus6DateString = "2024-06-06";

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
              schedules: [TestData.schedules.IstWorkHoursNoWeekends],
            },
          ],
          bookings: [
            {
              userId: 101,
              eventTypeId: 1,
              status: "ACCEPTED",
              // Fully book plus3 Date
              startTime: `${plus2DateString}T18:30:00.000Z`,
              endTime: `${plus3DateString}T18:30:00.000Z`,
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

        // plus1Date is a Saturday and not available
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus1DateString,
        });

        // plus2Date is a Sunday and not available
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus2DateString,
        });

        // plus3Date is fully booked. So, instead we will have timeslots one day later
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus3DateString,
        });

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus4DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveTimeSlots(
          expectedSlotsForSchedule["IstWorkHours"].interval["1hr"].allPossibleSlotsStartingAt430,
          {
            dateString: plus5DateString,
            doExactMatch: true,
          }
        );

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus6DateString,
        });
      });
    });

    describe("PeriodType=RANGE", () => {
      test("Basic test", async () => {
        vi.setSystemTime("2024-05-31T01:30:00Z");
        const yesterdayDateString = "2024-05-30";
        const todayDateString = "2024-05-31";
        const plus1DateString = "2024-06-01";
        const plus2DateString = "2024-06-02";
        const plus3DateString = "2024-06-03";
        const plus4DateString = "2024-06-04";
        const plus5DateString = "2024-06-05";

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

        // Before the start of the range
        expect(scheduleForEvent).toHaveDateDisabled({
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

        // After the range ends
        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus3DateString,
        });

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus4DateString,
        });

        expect(scheduleForEvent).toHaveDateDisabled({
          dateString: plus4DateString,
        });
      });
    });
  });
});
