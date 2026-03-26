import { describe, expect, it } from "vitest";

import { DEFAULT_SCHEDULE_DATA, detectEventTypeScheduleForUser } from "./detectEventTypeScheduleForUser";
import type { DetectEventTypeScheduleForUserInput } from "./detectEventTypeScheduleForUser";

describe("detectEventTypeScheduleForUser", () => {
  const mockUser = {
    id: 1,
    timeZone: "America/New_York",
    defaultScheduleId: 100,
    schedules: [
      {
        id: 100,
        timeZone: "America/New_York",
        availability: [],
      },
      {
        id: 101,
        timeZone: "Europe/London",
        availability: [],
      },
    ],
  };

  const createInput = (
    overrides: Partial<DetectEventTypeScheduleForUserInput> = {}
  ): DetectEventTypeScheduleForUserInput => ({
    user: mockUser,
    eventType: null,
    ...overrides,
  });

  it("should prioritize eventType.schedule if present", () => {
    const eventTypeSchedule = {
      id: 999,
      timeZone: "Asia/Tokyo",
      availability: [],
    };

    const input = createInput({
      eventType: {
        hosts: [],
        timeZone: null,
        schedule: eventTypeSchedule,
      },
    });

    const result = detectEventTypeScheduleForUser(input);

    expect(result.schedule).toEqual(expect.objectContaining({ id: 999, timeZone: "Asia/Tokyo" }));
    expect(result.isTimezoneSet).toBe(true);
    expect(result.isDefaultSchedule).toBe(false);
  });

  it("should prioritize host schedule if eventType.schedule is missing", () => {
    const hostSchedule = {
      id: 888,
      timeZone: "Europe/Berlin",
      availability: [],
    };

    const input = createInput({
      eventType: {
        hosts: [
          {
            user: { id: 1 },
            schedule: hostSchedule,
          },
        ],
        timeZone: null,
        schedule: null,
      },
    });

    const result = detectEventTypeScheduleForUser(input);

    expect(result.schedule).toEqual(expect.objectContaining({ id: 888, timeZone: "Europe/Berlin" }));
    expect(result.isTimezoneSet).toBe(true);
    expect(result.isDefaultSchedule).toBe(false);
  });

  it("should prioritize user default schedule if neither event nor host schedule is present", () => {
    const input = createInput({
      eventType: {
        hosts: [],
        timeZone: null,
        schedule: null,
      },
    });

    const result = detectEventTypeScheduleForUser(input);

    expect(result.schedule).toEqual(expect.objectContaining({ id: 100, timeZone: "America/New_York" }));
    expect(result.isTimezoneSet).toBe(true);
    // It matches the user's default schedule ID
    expect(result.isDefaultSchedule).toBe(true);
  });

  it("should use user schedule if it acts as host schedule", () => {
    // This covers the case where host schedule is explicitly set and matches a user schedule
    const userSchedule = mockUser.schedules[1]; // id 101
    const input = createInput({
      eventType: {
        hosts: [
          {
            user: { id: 1 },
            schedule: userSchedule,
          },
        ],
        timeZone: null,
        schedule: null,
      },
    });

    const result = detectEventTypeScheduleForUser(input);
    expect(result.schedule).toEqual(expect.objectContaining({ id: 101 }));
    expect(result.isDefaultSchedule).toBe(false); // 101 is not default (100 is)
  });

  it("should use fallback schedule if no schedules are found", () => {
    const userWithNoSchedules = {
      ...mockUser,
      schedules: [],
      defaultScheduleId: null,
    };

    const input = createInput({
      user: userWithNoSchedules,
      eventType: {
        hosts: [],
        timeZone: null,
        schedule: null,
      },
    });

    const result = detectEventTypeScheduleForUser(input);

    expect(result.schedule.id).toBe(0); // Default schedule ID
    expect(result.schedule.availability?.[0]?.days).toEqual(DEFAULT_SCHEDULE_DATA.availability?.[0]?.days);
    expect(result.isTimezoneSet).toBe(false); // Fallback schedule doesn't count as "set"
    expect(result.isDefaultSchedule).toBe(false);
  });

  it("should use eventType timezone as fallback if schedule timezone is missing", () => {
    const userWithNoSchedules = {
      ...mockUser,
      schedules: [],
      defaultScheduleId: null,
    };

    const input = createInput({
      user: userWithNoSchedules,
      eventType: {
        hosts: [],
        timeZone: "Pacific/Honolulu",
        schedule: null,
      },
    });

    const result = detectEventTypeScheduleForUser(input);

    // Schedule itself (fallback) has no timezone, so it picks up the fallback
    expect(result.schedule.timeZone).toBe("Pacific/Honolulu");
    expect(result.isTimezoneSet).toBe(false);
  });

  it("should use user timezone as fallback if everything else is missing", () => {
    const userWithNoSchedules = {
      ...mockUser,
      schedules: [],
      defaultScheduleId: null,
      timeZone: "Africa/Cairo",
    };

    const input = createInput({
      user: userWithNoSchedules,
      eventType: {
        hosts: [],
        timeZone: null,
        schedule: null,
      },
    });

    const result = detectEventTypeScheduleForUser(input);

    expect(result.schedule.timeZone).toBe("Africa/Cairo");
    expect(result.isTimezoneSet).toBe(false);
  });
});
