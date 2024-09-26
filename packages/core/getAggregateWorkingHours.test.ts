import { describe, it, expect } from "vitest";

import type { WorkingHours } from "@calcom/types/schedule";

import { getAggregateWorkingHours } from "./getAggregateWorkingHours";

describe("getAggregateWorkingHours", () => {
  it("should return all schedules if no scheduling type", () => {
    const workingHours: WorkingHours[] = [
      {
        days: [1, 2, 3],
        startTime: 0,
        endTime: 720,
      },
    ];
    const result = getAggregateWorkingHours(
      [
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours,
          dateOverrides: [],
          datesOutOfOffice: {},
        },
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours,
          dateOverrides: [],
          datesOutOfOffice: {},
        },
      ],
      null
    );

    expect(result).toEqual([...workingHours, ...workingHours]);
  });

  it("should return all schedules if no fixed users exist", () => {
    const workingHours: WorkingHours[] = [
      {
        days: [1, 2, 3],
        startTime: 0,
        endTime: 720,
      },
    ];
    const result = getAggregateWorkingHours(
      [
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours,
          dateOverrides: [],
          datesOutOfOffice: {},
        },
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours,
          dateOverrides: [],
          datesOutOfOffice: {},
        },
      ],
      "MANAGED"
    );

    expect(result).toEqual([...workingHours, ...workingHours]);
  });

  it("should consider all schedules fixed if collective", () => {
    const workingHoursA: WorkingHours[] = [
      {
        days: [1, 2],
        startTime: 0,
        endTime: 200,
      },
    ];
    const workingHoursB: WorkingHours[] = [
      {
        days: [2, 3],
        startTime: 100,
        endTime: 300,
      },
    ];
    const result = getAggregateWorkingHours(
      [
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursA,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: false,
          },
        },
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursB,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: false,
          },
        },
      ],
      "COLLECTIVE"
    );

    expect(result).toEqual([
      {
        days: [2],
        startTime: 100,
        endTime: 200,
      },
    ]);
  });

  it("should include loose host hours", () => {
    const workingHoursA: WorkingHours[] = [
      {
        days: [1, 2],
        startTime: 0,
        endTime: 200,
      },
    ];
    const workingHoursB: WorkingHours[] = [
      {
        days: [2, 3],
        startTime: 100,
        endTime: 300,
      },
    ];
    const result = getAggregateWorkingHours(
      [
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursA,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: false,
          },
        },
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursB,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: true,
          },
        },
      ],
      "COLLECTIVE"
    );

    expect(result).toEqual([
      {
        days: [2],
        startTime: 100,
        endTime: 200,
        userId: undefined,
      },
    ]);
  });

  it("should return last user's hours if no intersection", () => {
    const workingHoursA: WorkingHours[] = [
      {
        days: [1],
        startTime: 0,
        endTime: 200,
      },
    ];
    const workingHoursB: WorkingHours[] = [
      {
        days: [2],
        startTime: 100,
        endTime: 300,
      },
    ];
    const result = getAggregateWorkingHours(
      [
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursA,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: true,
          },
        },
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursB,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: true,
          },
        },
      ],
      "COLLECTIVE"
    );

    expect(result).toEqual([...workingHoursB]);
  });

  it("should include user IDs when not collective", () => {
    const workingHoursA: WorkingHours[] = [
      {
        days: [1, 2],
        startTime: 0,
        endTime: 200,
        userId: 1,
      },
    ];
    const workingHoursB: WorkingHours[] = [
      {
        days: [2, 3],
        startTime: 100,
        endTime: 300,
        userId: 2,
      },
    ];
    const result = getAggregateWorkingHours(
      [
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursA,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: true,
          },
        },
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursB,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: true,
          },
        },
      ],
      "MANAGED"
    );

    expect(result).toEqual([
      {
        userId: 1,
        days: [2],
        startTime: 100,
        endTime: 200,
      },
    ]);
  });

  it("should handle multiple intersections", () => {
    const workingHoursA: WorkingHours[] = [
      {
        days: [1, 2],
        startTime: 0,
        endTime: 200,
      },
      {
        days: [3, 4],
        startTime: 100,
        endTime: 300,
      },
    ];
    const workingHoursB: WorkingHours[] = [
      {
        days: [2, 3],
        startTime: 100,
        endTime: 300,
      },
      {
        days: [4, 5],
        startTime: 0,
        endTime: 200,
      },
    ];
    const result = getAggregateWorkingHours(
      [
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursA,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: true,
          },
        },
        {
          busy: [],
          timeZone: "Europe/London",
          workingHours: workingHoursB,
          dateOverrides: [],
          datesOutOfOffice: {},
          user: {
            isFixed: true,
          },
        },
      ],
      "COLLECTIVE"
    );

    expect(result).toEqual([
      {
        days: [2],
        startTime: 100,
        endTime: 200,
        userId: undefined,
      },
      {
        days: [3],
        startTime: 100,
        endTime: 300,
        userId: undefined,
      },
      {
        days: [4],
        startTime: 100,
        endTime: 200,
        userId: undefined,
      },
    ]);
  });
});
