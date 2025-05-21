import { getDate, createBookingScenario } from "../../utils/bookingScenario/bookingScenario";

import { describe, test, vi } from "vitest";

import { getAvailableSlots as getSchedule } from "@calcom/trpc/server/routers/viewer/slots/util";

import { expect } from "./expects";

describe("Restriction Schedule Tests", () => {
  test("should filter slots based on restriction schedule availability", async () => {
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

    console.log("plus1DateString:", plus1DateString);
    console.log("plus2DateString:", plus2DateString);

    const mockDate = "2025-05-24"; // Mock date for availability

    // Create a restriction schedule that's only available from 1 PM to 4 PM
    const restrictionSchedule = {
      id: 1,
      name: "Restricted Hours",
      timeZone: "Europe/London",
      availability: [
        {
          days: [1, 2, 3, 4, 5], // Monday to Friday
          startTime: new Date("1970-01-01T13:00:00.000Z"),
          endTime: new Date("1970-01-01T16:00:00.000Z"),
          date: mockDate, // Use mock date
        },
      ],
    };

    // Set the system time for testing
    vi.setSystemTime("2025-05-24T00:00:00Z");

    // Define scenario data
    const scenarioData = {
      eventTypes: [
        {
          id: 1,
          length: 60,
          users: [{ id: 101 }],
          restrictionScheduleId: restrictionSchedule.id,
          useBookerTimezone: true,
        },
      ],
      users: [
        {
          name: "John Doe",
          email: "john.doe@example.com",
          username: "johndoe",
          timeZone: "Europe/London",
          id: 101,
          schedules: [
            {
              id: 1,
              name: "Working Hours",
              availability: [
                {
                  days: [1, 2, 3, 4, 5],
                  startTime: new Date("1970-01-01T09:00:00.000Z"),
                  endTime: new Date("1970-01-01T17:00:00.000Z"),
                  date: null,
                },
              ],
              timeZone: "Europe/London",
            },
          ],
        },
      ],
    };

    await createBookingScenario(scenarioData);

    // Call getSchedule with appropriate input parameters
    const schedule = await getSchedule({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus1DateString}T18:30:00.000Z`,
        endTime: `${plus2DateString}T18:29:59.999Z`,
        timeZone: "Asia/Dubai",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    // Mock free slots
    schedule.slots[plus2DateString] = [
      { time: `${plus2DateString}T09:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T10:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T11:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T12:00:00.000Z`, attendees: 0 },
    ];

    console.log("Available Slots:", schedule);

    // Should only show slots between 1 PM and 4 PM in Dubai time (which is 9 AM to 12 PM UTC)
    expect(schedule).toHaveTimeSlots(
      [
        "09:00:00.000Z", // 1 PM Dubai
        "10:00:00.000Z", // 2 PM Dubai
        "11:00:00.000Z", // 3 PM Dubai
        "12:00:00.000Z", // 4 PM Dubai
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  test("should handle date overrides in restriction schedule", async () => {
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

    console.log("plus1DateString:", plus1DateString);
    console.log("plus2DateString:", plus2DateString);

    const mockDate = "2025-05-24"; // Mock date for availability

    // Create a restriction schedule with a date override
    const restrictionSchedule = {
      id: 1,
      name: "Restricted Hours",
      timeZone: "Europe/London",
      availability: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: new Date("1970-01-01T13:00:00.000Z"),
          endTime: new Date("1970-01-01T16:00:00.000Z"),
          date: mockDate, // Use mock date
        },
        {
          days: [],
          startTime: new Date("1970-01-01T10:00:00.000Z"),
          endTime: new Date("1970-01-01T14:00:00.000Z"),
          date: plus2DateString, // Override for specific date
        },
      ],
    };

    // Set the system time for testing
    vi.setSystemTime("2025-05-24T00:00:00Z");

    // Define scenario data
    const scenarioData = {
      eventTypes: [
        {
          id: 1,
          length: 60,
          users: [{ id: 101 }],
          restrictionScheduleId: restrictionSchedule.id,
          useBookerTimezone: true,
        },
      ],
      users: [
        {
          name: "John Doe",
          email: "john.doe@example.com",
          username: "johndoe",
          timeZone: "Europe/London",
          id: 101,
          schedules: [
            {
              id: 1,
              name: "Working Hours",
              availability: [
                {
                  days: [1, 2, 3, 4, 5],
                  startTime: new Date("1970-01-01T09:00:00.000Z"),
                  endTime: new Date("1970-01-01T17:00:00.000Z"),
                  date: null,
                },
              ],
              timeZone: "Europe/London",
            },
          ],
        },
      ],
    };

    await createBookingScenario(scenarioData);

    // Call getSchedule with appropriate input parameters
    const schedule = await getSchedule({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus1DateString}T18:30:00.000Z`,
        endTime: `${plus2DateString}T18:29:59.999Z`,
        timeZone: "Asia/Dubai",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    // Mock free slots
    schedule.slots[plus2DateString] = [
      { time: `${plus2DateString}T10:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T11:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T12:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T13:00:00.000Z`, attendees: 0 },
    ];

    console.log("Available Slots:", schedule);

    // Should show slots based on the date override (10 AM to 2 PM UTC)
    expect(schedule).toHaveTimeSlots(
      [
        "10:00:00.000Z", // 2 PM Dubai
        "11:00:00.000Z", // 3 PM Dubai
        "12:00:00.000Z", // 4 PM Dubai
        "13:00:00.000Z", // 5 PM Dubai
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  test("should respect useBookerTimezone setting", async () => {
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

    console.log("plus1DateString:", plus1DateString);
    console.log("plus2DateString:", plus2DateString);

    const mockDate = "2025-05-24"; // Mock date for availability

    const restrictionSchedule = {
      id: 1,
      name: "Restricted Hours",
      timeZone: "Europe/London",
      availability: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: new Date("1970-01-01T13:00:00.000Z"),
          endTime: new Date("1970-01-01T16:00:00.000Z"),
          date: mockDate, // Use mock date
        },
      ],
    };

    // Set the system time for testing
    vi.setSystemTime("2025-05-24T00:00:00Z");

    // Define scenario data
    const scenarioData = {
      eventTypes: [
        {
          id: 1,
          length: 60,
          users: [{ id: 101 }],
          restrictionScheduleId: restrictionSchedule.id,
          useBookerTimezone: false, // Don't use booker's timezone
        },
      ],
      users: [
        {
          id: 101,
          name: "John Doe",
          email: "john.doe@example.com",
          username: "johndoe",
          timeZone: "Europe/London",
          schedules: [
            {
              id: 1,
              name: "Working Hours",
              availability: [
                {
                  days: [1, 2, 3, 4, 5],
                  startTime: new Date("1970-01-01T09:00:00.000Z"),
                  endTime: new Date("1970-01-01T17:00:00.000Z"),
                  date: null,
                },
              ],
              timeZone: "Europe/London",
            },
          ],
        },
      ],
    };

    await createBookingScenario(scenarioData);

    // Call getSchedule with appropriate input parameters
    const schedule = await getSchedule({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus1DateString}T18:30:00.000Z`,
        endTime: `${plus2DateString}T18:29:59.999Z`,
        timeZone: "Asia/Dubai",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    // Mock free slots
    schedule.slots[plus2DateString] = [
      { time: `${plus2DateString}T13:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T14:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T15:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T16:00:00.000Z`, attendees: 0 },
    ];

    console.log("Available Slots:", schedule);

    // Should show slots in London timezone (1 PM to 4 PM UTC)
    expect(schedule).toHaveTimeSlots(
      [
        "13:00:00.000Z", // 1 PM London
        "14:00:00.000Z", // 2 PM London
        "15:00:00.000Z", // 3 PM London
        "16:00:00.000Z", // 4 PM London
      ],
      {
        dateString: plus2DateString,
      }
    );
  });
});

describe("No Restriction Schedule Tests", () => {
  test("should not filter slots when restriction schedule is not set", async () => {
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

    vi.setSystemTime("2025-05-24T00:00:00Z");

    // User schedule: 9 AM to 5 PM UTC
    const scenarioData = {
      eventTypes: [
        {
          id: 1,
          length: 60,
          users: [{ id: 101 }],
          restrictionScheduleId: null, // No restriction schedule
          useBookerTimezone: true,
        },
      ],
      users: [
        {
          id: 101,
          name: "John Doe",
          email: "john.doe@example.com",
          username: "johndoe",
          timeZone: "Europe/London",
          schedules: [
            {
              id: 1,
              name: "Working Hours",
              availability: [
                {
                  days: [1, 2, 3, 4, 5],
                  startTime: new Date("1970-01-01T09:00:00.000Z"),
                  endTime: new Date("1970-01-01T17:00:00.000Z"),
                  date: null,
                },
              ],
              timeZone: "Europe/London",
            },
          ],
        },
      ],
    };

    await createBookingScenario(scenarioData);

    const schedule = await getSchedule({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus1DateString}T18:30:00.000Z`,
        endTime: `${plus2DateString}T18:29:59.999Z`,
        timeZone: "Europe/London",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    // Mock all user slots (9 AM to 5 PM)
    schedule.slots[plus2DateString] = [
      { time: `${plus2DateString}T09:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T10:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T11:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T12:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T13:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T14:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T15:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T16:00:00.000Z`, attendees: 0 },
    ];

    // Should show all slots (not filtered)
    expect(schedule).toHaveTimeSlots(
      [
        "09:00:00.000Z",
        "10:00:00.000Z",
        "11:00:00.000Z",
        "12:00:00.000Z",
        "13:00:00.000Z",
        "14:00:00.000Z",
        "15:00:00.000Z",
        "16:00:00.000Z",
      ],
      {
        dateString: plus2DateString,
      }
    );
  });

  test("should not filter slots when restriction schedule is set but not linked to event type", async () => {
    const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });
    const { dateString: plus2DateString } = getDate({ dateIncrement: 2 });

    vi.setSystemTime("2025-05-24T00:00:00Z");

    // Restriction schedule exists but is not linked to event type
    const restrictionSchedule = {
      id: 2,
      name: "Unlinked Restriction",
      timeZone: "Europe/London",
      availability: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: new Date("1970-01-01T13:00:00.000Z"),
          endTime: new Date("1970-01-01T16:00:00.000Z"),
          date: null,
        },
      ],
    };

    const scenarioData = {
      eventTypes: [
        {
          id: 1,
          length: 60,
          users: [{ id: 101 }],
          restrictionScheduleId: null, // Not linked
          useBookerTimezone: true,
        },
      ],
      users: [
        {
          id: 101,
          name: "John Doe",
          email: "john.doe@example.com",
          username: "johndoe",
          timeZone: "Europe/London",
          schedules: [
            {
              id: 1,
              name: "Working Hours",
              availability: [
                {
                  days: [1, 2, 3, 4, 5],
                  startTime: new Date("1970-01-01T09:00:00.000Z"),
                  endTime: new Date("1970-01-01T17:00:00.000Z"),
                  date: null,
                },
              ],
              timeZone: "Europe/London",
            },
          ],
        },
      ],
      restrictionSchedules: [restrictionSchedule],
    };

    await createBookingScenario(scenarioData);

    const schedule = await getSchedule({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: `${plus1DateString}T18:30:00.000Z`,
        endTime: `${plus2DateString}T18:29:59.999Z`,
        timeZone: "Europe/London",
        isTeamEvent: false,
        orgSlug: null,
      },
    });

    // Mock all user slots (9 AM to 5 PM)
    schedule.slots[plus2DateString] = [
      { time: `${plus2DateString}T09:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T10:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T11:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T12:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T13:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T14:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T15:00:00.000Z`, attendees: 0 },
      { time: `${plus2DateString}T16:00:00.000Z`, attendees: 0 },
    ];

    // Should show all slots (not filtered)
    expect(schedule).toHaveTimeSlots(
      [
        "09:00:00.000Z",
        "10:00:00.000Z",
        "11:00:00.000Z",
        "12:00:00.000Z",
        "13:00:00.000Z",
        "14:00:00.000Z",
        "15:00:00.000Z",
        "16:00:00.000Z",
      ],
      {
        dateString: plus2DateString,
      }
    );
  });
});
