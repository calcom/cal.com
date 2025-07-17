import {
  createBookingScenario,
  TestData,
  Timezones,
} from "../../apps/web/test/utils/bookingScenario/bookingScenario";

import { describe, expect, it, vi } from "vitest";

import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";
import { SchedulingType } from "@calcom/prisma/enums";

import { setupAndTeardown } from "../../apps/web/test/lib/getSchedule/setupAndTeardown";

vi.mock("@calcom/lib/constants", () => ({
  IS_PRODUCTION: true,
  WEBAPP_URL: "http://localhost:3000",
  RESERVED_SUBDOMAINS: ["auth", "docs"],
  SINGLE_ORG_SLUG: "",
}));

describe("getSlots Performance Tests - Complex Team Scenarios", () => {
  const availableSlotsService = getAvailableSlotsService();
  setupAndTeardown();

  const VenezuelaSchedule = {
    name: "Venezuela Afternoon Shift - 13:00-17:00, 18:00-22:00 VET (UTC-4)",
    availability: [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T17:00:00.000Z"),
        endTime: new Date("1970-01-01T21:00:00.000Z"),
        date: null,
      },
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T22:00:00.000Z"),
        endTime: new Date("1970-01-02T02:00:00.000Z"),
        date: null,
      },
    ],
    timeZone: "America/Caracas",
  };

  const NetherlandsSchedule = {
    name: "Netherlands Standard Hours - 8:00-12:00, 13:00-17:00 CET (UTC+1)",
    availability: [
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date("1970-01-01T07:00:00.000Z"),
        endTime: new Date("1970-01-01T11:00:00.000Z"),
        date: null,
      },
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date("1970-01-01T12:00:00.000Z"),
        endTime: new Date("1970-01-01T16:00:00.000Z"),
        date: null,
      },
    ],
    timeZone: "Europe/Amsterdam",
  };

  const IndiaLunchSchedule = {
    name: "India Morning with Lunch - 9:30-13:00, 14:00-18:00 IST (UTC+5:30)",
    availability: [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T04:00:00.000Z"),
        endTime: new Date("1970-01-01T07:30:00.000Z"),
        date: null,
      },
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: new Date("1970-01-01T08:30:00.000Z"),
        endTime: new Date("1970-01-01T12:30:00.000Z"),
        date: null,
      },
    ],
    timeZone: Timezones["+5:30"],
  };

  const createComplexTeamScenario = async (schedulingType: SchedulingType, hostCount = 8) => {
    const hosts = [];
    const users = [];

    for (let i = 0; i < hostCount; i++) {
      const userId = 100 + i;
      let schedule;

      if (i % 3 === 0) {
        schedule = IndiaLunchSchedule;
      } else if (i % 3 === 1) {
        schedule = VenezuelaSchedule;
      } else {
        schedule = NetherlandsSchedule;
      }

      hosts.push({
        userId,
        isFixed: false,
      });

      users.push({
        ...TestData.users.example,
        email: `host${i}@example.com`,
        id: userId,
        schedules: [schedule],
        defaultScheduleId: userId,
      });
    }

    const fixedUserId = 200;
    hosts.push({
      userId: fixedUserId,
      isFixed: true,
    });

    users.push({
      ...TestData.users.example,
      email: "fixed@example.com",
      id: fixedUserId,
      schedules: [TestData.schedules.IstWorkHours],
      defaultScheduleId: fixedUserId,
    });

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 60,
          length: 60,
          hosts,
          schedulingType,
        },
      ],
      users,
      bookings: [],
    });
  };

  const measureSlotGeneration = async (
    eventTypeId: number,
    dateRange: { start: string; end: string },
    testName: string
  ) => {
    const startTime = process.hrtime();

    const result = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId,
        eventTypeSlug: "",
        startTime: dateRange.start,
        endTime: dateRange.end,
        timeZone: Timezones["+5:30"],
        isTeamEvent: true,
        orgSlug: null,
      },
    });

    const endTime = process.hrtime(startTime);
    const executionTimeInMs = endTime[0] * 1000 + endTime[1] / 1000000;

    const totalSlots = Object.values(result.slots).reduce((sum, daySlots) => sum + daySlots.length, 0);

    console.log(
      `${testName}: ${executionTimeInMs.toFixed(2)}ms for ${totalSlots} slots (${(
        totalSlots / executionTimeInMs
      ).toFixed(2)} slots/ms)`
    );

    return {
      executionTimeInMs,
      totalSlots,
      slotsPerMs: totalSlots / executionTimeInMs,
      result,
    };
  };

  it("Performance Test 1: Baseline - Simple schedules with 2 hosts", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const extendedSchedule = {
      name: "Extended availability schedule",
      availability: [
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T00:00:00.000Z"),
          endTime: new Date("1970-01-01T23:30:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    };

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 30,
          hosts: [
            { userId: 101, isFixed: false },
            { userId: 102, isFixed: true },
          ],
          schedulingType: SchedulingType.ROUND_ROBIN,
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "host1@example.com",
          id: 101,
          schedules: [extendedSchedule],
          defaultScheduleId: 101,
        },
        {
          ...TestData.users.example,
          email: "host2@example.com",
          id: 102,
          schedules: [extendedSchedule],
          defaultScheduleId: 102,
        },
      ],
      bookings: [],
    });

    const dateRange = {
      start: "2024-05-22T00:00:00.000Z",
      end: "2024-07-17T23:59:59.999Z",
    };

    const metrics = await measureSlotGeneration(1, dateRange, "Baseline (2 hosts, 2 weeks)");

    expect(metrics.executionTimeInMs).toBeLessThan(2000);
    expect(metrics.totalSlots).toBeGreaterThan(300);
  });

  it("Performance Test 2: Complex schedules with lunch breaks - 8 hosts", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    await createComplexTeamScenario(SchedulingType.ROUND_ROBIN, 8);

    const dateRange = {
      start: "2024-05-22T00:00:00.000Z",
      end: "2024-07-31T23:59:59.999Z",
    };

    const metrics = await measureSlotGeneration(1, dateRange, "Complex schedules (8 hosts, 4 weeks)");

    expect(metrics.executionTimeInMs).toBeLessThan(10000);
    expect(metrics.totalSlots).toBeGreaterThan(400);
  });

  it("Performance Test 3: ROUND_ROBIN vs COLLECTIVE comparison", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const dateRange = {
      start: "2024-05-22T00:00:00.000Z",
      end: "2024-07-24T23:59:59.999Z",
    };

    await createComplexTeamScenario(SchedulingType.ROUND_ROBIN, 4);
    const roundRobinMetrics = await measureSlotGeneration(1, dateRange, "ROUND_ROBIN (4 hosts, 3 weeks)");

    await createComplexTeamScenario(SchedulingType.COLLECTIVE, 4);
    const collectiveMetrics = await measureSlotGeneration(1, dateRange, "COLLECTIVE (4 hosts, 3 weeks)");

    console.log(
      `Performance comparison: ROUND_ROBIN ${roundRobinMetrics.executionTimeInMs.toFixed(
        2
      )}ms vs COLLECTIVE ${collectiveMetrics.executionTimeInMs.toFixed(2)}ms`
    );

    expect(roundRobinMetrics.executionTimeInMs).toBeLessThan(5000);
    expect(collectiveMetrics.executionTimeInMs).toBeLessThan(5000);
    expect(roundRobinMetrics.totalSlots).toBeGreaterThan(350);
    expect(collectiveMetrics.totalSlots).toBeGreaterThan(350);
  });

  it("Performance Test 4: Scaling with host count", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const dateRange = {
      start: "2024-05-22T00:00:00.000Z",
      end: "2024-07-24T23:59:59.999Z",
    };

    const hostCounts = [2, 4, 8];
    const results = [];

    for (const hostCount of hostCounts) {
      await createComplexTeamScenario(SchedulingType.ROUND_ROBIN, hostCount);
      const metrics = await measureSlotGeneration(1, dateRange, `Scaling test (${hostCount} hosts, 3 weeks)`);
      results.push({ hostCount, ...metrics });
    }

    console.log("Scaling analysis:");
    results.forEach((result) => {
      console.log(
        `${result.hostCount} hosts: ${result.executionTimeInMs.toFixed(2)}ms, ${result.totalSlots} slots`
      );
    });

    results.forEach((result) => {
      expect(result.executionTimeInMs).toBeLessThan(8000);
      expect(result.totalSlots).toBeGreaterThan(350);
    });
  });

  it("Performance Test 5: Timezone complexity impact", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const dateRange = {
      start: "2024-05-22T00:00:00.000Z",
      end: "2024-07-24T23:59:59.999Z",
    };

    const extendedFixedSchedule = {
      name: "Extended fixed host schedule",
      availability: [
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T00:00:00.000Z"),
          endTime: new Date("1970-01-01T23:30:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    };

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 30,
          hosts: [
            { userId: 101, isFixed: false },
            { userId: 102, isFixed: false },
            { userId: 103, isFixed: false },
            { userId: 104, isFixed: true },
          ],
          schedulingType: SchedulingType.ROUND_ROBIN,
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "india@example.com",
          id: 101,
          schedules: [IndiaLunchSchedule],
          defaultScheduleId: 101,
        },
        {
          ...TestData.users.example,
          email: "venezuela@example.com",
          id: 102,
          schedules: [VenezuelaSchedule],
          defaultScheduleId: 102,
        },
        {
          ...TestData.users.example,
          email: "netherlands@example.com",
          id: 103,
          schedules: [NetherlandsSchedule],
          defaultScheduleId: 103,
        },
        {
          ...TestData.users.example,
          email: "fixed@example.com",
          id: 104,
          schedules: [extendedFixedSchedule],
          defaultScheduleId: 104,
        },
      ],
      bookings: [],
    });

    const metrics = await measureSlotGeneration(1, dateRange, "Multi-timezone complexity (3 weeks)");

    expect(metrics.executionTimeInMs).toBeLessThan(5000);
    expect(metrics.totalSlots).toBeGreaterThan(500);
  });

  it("Performance Test 6: Date range size impact", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    await createComplexTeamScenario(SchedulingType.ROUND_ROBIN, 4);

    const dateRanges = [
      {
        name: "4 weeks",
        start: "2024-05-22T00:00:00.000Z",
        end: "2024-06-19T23:59:59.999Z",
      },
      {
        name: "8 weeks",
        start: "2024-05-22T00:00:00.000Z",
        end: "2024-07-17T23:59:59.999Z",
      },
      {
        name: "12 weeks",
        start: "2024-05-22T00:00:00.000Z",
        end: "2024-08-14T23:59:59.999Z",
      },
    ];

    const results = [];

    for (const range of dateRanges) {
      const metrics = await measureSlotGeneration(1, range, `Date range: ${range.name}`);
      results.push({ rangeName: range.name, ...metrics });
    }

    console.log("Date range scaling analysis:");
    results.forEach((result) => {
      console.log(
        `${result.rangeName}: ${result.executionTimeInMs.toFixed(2)}ms, ${result.totalSlots} slots`
      );
    });

    results.forEach((result) => {
      expect(result.executionTimeInMs).toBeLessThan(15000);
      expect(result.totalSlots).toBeGreaterThan(150);
    });
  });

  it("Performance Test 7: Date overrides impact", async () => {
    vi.setSystemTime("2024-05-21T00:00:13Z");

    const scheduleWithOverrides = {
      name: "Extended schedule with multiple date overrides",
      availability: [
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T02:00:00.000Z"),
          endTime: new Date("1970-01-01T20:30:00.000Z"),
          date: null,
        },
        {
          days: [],
          startTime: new Date("1970-01-01T06:00:00.000Z"),
          endTime: new Date("1970-01-01T18:00:00.000Z"),
          date: "2024-05-23",
        },
        {
          days: [],
          startTime: new Date("1970-01-01T08:00:00.000Z"),
          endTime: new Date("1970-01-01T22:00:00.000Z"),
          date: "2024-05-24",
        },
        {
          days: [],
          startTime: new Date("1970-01-01T00:00:00.000Z"),
          endTime: new Date("1970-01-01T00:00:00.000Z"),
          date: "2024-05-25",
        },
      ],
      timeZone: Timezones["+5:30"],
    };

    const extendedFixedSchedule = {
      name: "Extended fixed host schedule",
      availability: [
        {
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: new Date("1970-01-01T00:00:00.000Z"),
          endTime: new Date("1970-01-01T23:30:00.000Z"),
          date: null,
        },
      ],
      timeZone: Timezones["+5:30"],
    };

    await createBookingScenario({
      eventTypes: [
        {
          id: 1,
          slotInterval: 15,
          length: 30,
          hosts: [
            { userId: 101, isFixed: false },
            { userId: 102, isFixed: false },
            { userId: 103, isFixed: true },
          ],
          schedulingType: SchedulingType.ROUND_ROBIN,
        },
      ],
      users: [
        {
          ...TestData.users.example,
          email: "override1@example.com",
          id: 101,
          schedules: [scheduleWithOverrides],
          defaultScheduleId: 101,
        },
        {
          ...TestData.users.example,
          email: "override2@example.com",
          id: 102,
          schedules: [scheduleWithOverrides],
          defaultScheduleId: 102,
        },
        {
          ...TestData.users.example,
          email: "fixed@example.com",
          id: 103,
          schedules: [extendedFixedSchedule],
          defaultScheduleId: 103,
        },
      ],
      bookings: [],
    });

    const dateRange = {
      start: "2024-05-22T00:00:00.000Z",
      end: "2024-07-24T23:59:59.999Z",
    };

    const metrics = await measureSlotGeneration(1, dateRange, "Date overrides impact (3 weeks)");

    expect(metrics.executionTimeInMs).toBeLessThan(5000);
    expect(metrics.totalSlots).toBeGreaterThan(500);
  });
});
