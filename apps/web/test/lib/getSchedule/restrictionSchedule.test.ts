import prismock from "@calcom/testing/lib/__mocks__/prisma";
import {
  createBookingScenario,
  type ScenarioData,
  TestData,
  Timezones,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import type { getScheduleSchema } from "@calcom/trpc/server/routers/viewer/slots/types";
import { describe, test, vi } from "vitest";
import type { z } from "zod";
import { expect } from "./expects";
import { setupAndTeardown } from "./setupAndTeardown";

// Mock the FeaturesRepository to enable restriction-schedule feature
vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: vi.fn().mockImplementation(function () {
    return {
      checkIfTeamHasFeature: vi.fn().mockResolvedValue(true),
      checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(true),
      getAllFeatures: vi.fn().mockResolvedValue([]),
      getFeatureFlagMap: vi.fn().mockResolvedValue({}),
      checkIfUserHasFeature: vi.fn().mockResolvedValue(true),
    };
  }),
}));

type ScheduleScenario = {
  eventTypes: ScenarioData["eventTypes"];
  users: ScenarioData["users"];
  apps: ScenarioData["apps"];
  selectedSlots?: ScenarioData["selectedSlots"];
};

const getTestScheduleInput = ({
  yesterdayDateString,
  plus5DateString,
}: {
  yesterdayDateString: string;
  plus5DateString: string;
}): z.infer<typeof getScheduleSchema> => ({
  eventTypeId: 1,
  eventTypeSlug: "",
  startTime: `${yesterdayDateString}T18:30:00.000Z`,
  endTime: `${plus5DateString}T18:29:59.999Z`,
  timeZone: Timezones["+5:30"],
  isTeamEvent: true,
  orgSlug: null,
});

const getBaseScenarioData = (): ScheduleScenario => ({
  eventTypes: [
    {
      id: 1,
      slotInterval: 60,
      length: 60,
      teamId: 1,
      hosts: [{ userId: 101 }],
    },
  ],
  users: [
    {
      ...TestData.users.example,
      id: 101,
      schedules: [TestData.schedules.IstWorkHours],
      teams: [
        {
          membership: { role: "ADMIN", accepted: true },
          team: { id: 1, name: "Test Team", slug: "test-team" },
        },
      ],
    },
  ],
  apps: [],
});

// Helper function to set up team for the tests
async function setupTeamAndFeatures() {
  // Create the team (needed for event type configuration)
  await prismock.team.create({
    data: {
      id: 1,
      name: "Test Team",
      slug: "test-team",
    },
  });
}

describe("getSchedule", () => {
  const availableSlotsService = getAvailableSlotsService();
  setupAndTeardown();

  describe("Restriction Schedule", () => {
    test("should respect date override rule in restrictionSchedule (Europe/London, useBookerTimezone=false)", async () => {
      await setupTeamAndFeatures();
      vi.setSystemTime("2025-06-01T23:30:00Z");

      const plus2DateString = "2025-06-02"; // Date with override
      const plus5DateString = "2025-06-05";

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        eventTypes: [
          {
            id: 1,
            length: 60,
            teamId: 1,
            restrictionScheduleId: 50,
            useBookerTimezone: false,
            hosts: [{ userId: 101 }],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "Test Schedule",
                timeZone: "Europe/London",
                availability: [
                  {
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T09:00:00.000Z"),
                    endTime: new Date("1970-01-01T17:00:00.000Z"),
                    date: null,
                  },
                ],
              },
            ],
            teams: [
              {
                membership: { role: "ADMIN", accepted: true },
                team: { id: 1, name: "Test Team", slug: "test-team" },
              },
            ],
          },
        ],
      };

      scenarioData.users[0].schedules.push({
        id: 50,
        name: "Restriction Schedule - Only Date Override",
        timeZone: "Asia/Dubai",
        availability: [
          {
            date: "2025-06-02T00:00:00.000Z",
            days: [],
            startTime: new Date("1970-01-01T10:00:00.000Z"),
            endTime: new Date("1970-01-01T18:00:00.000Z"),
          },
        ],
      });

      await createBookingScenario(scenarioData);

      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus5DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      // Expected slots based on intersection of:
      // - User availability: 9 AM - 5 PM London
      // - Restriction: 10 AM - 6 PM Dubai
      const expectedUtcSlots = [
        "2025-06-02T08:30:00.000Z", // 9:30 AM London, 12:30 PM Dubai, 2:00 PM Kolkata
        "2025-06-02T09:30:00.000Z", // 10:30 AM London, 1:30 PM Dubai, 3:00 PM Kolkata
        "2025-06-02T10:30:00.000Z", // 11:30 AM London, 2:30 PM Dubai, 4:00 PM Kolkata
        "2025-06-02T11:30:00.000Z", // 12:30 PM London, 3:30 PM Dubai, 5:00 PM Kolkata
        "2025-06-02T12:30:00.000Z", // 1:30 PM London, 4:30 PM Dubai, 6:00 PM Kolkata
      ];

      expect(result).toHaveTimeSlots(expectedUtcSlots, {
        dateString: plus2DateString,
        doExactMatch: false,
      });
      expect(result).toHaveDateDisabled({ dateString: "2025-06-03" });
    });

    test("should respect recurring rule in restrictionSchedule (Europe/London, useBookerTimezone=false)", async () => {
      await setupTeamAndFeatures();
      vi.setSystemTime("2025-06-01T23:30:00Z");

      const plus2DateString = "2025-06-02"; // Monday
      const plus6DateString = "2025-06-06"; // Friday

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        eventTypes: [
          {
            id: 1,
            length: 60,
            teamId: 1,
            restrictionScheduleId: 50,
            useBookerTimezone: false,
            hosts: [{ userId: 101 }],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "Test Schedule",
                timeZone: "Europe/London",
                availability: [
                  {
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T09:00:00.000Z"),
                    endTime: new Date("1970-01-01T17:00:00.000Z"),
                    date: null,
                  },
                ],
              },
            ],
            teams: [
              {
                membership: { role: "ADMIN", accepted: true },
                team: { id: 1, name: "Test Team", slug: "test-team" },
              },
            ],
          },
        ],
      };

      scenarioData.users[0].schedules.push({
        id: 50,
        name: "Test Schedule",
        timeZone: "Asia/Dubai",
        availability: [
          {
            days: [1, 2, 3, 4, 5],
            startTime: new Date("1970-01-01T10:00:00.000Z"),
            endTime: new Date("1970-01-01T18:00:00.000Z"),
            date: null,
          },
        ],
      });

      await createBookingScenario(scenarioData);

      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus6DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      // Expected slots based on intersection of:
      // - User availability: 9 AM - 5 PM London
      // - Restriction: 10 AM - 6 PM Dubai, weekdays only
      const getExpectedSlotsForDate = (dateString: string) => [
        `${dateString}T08:30:00.000Z`, // 9:30 AM London, 12:30 PM Dubai, 2:00 PM Kolkata
        `${dateString}T09:30:00.000Z`, // 10:30 AM London, 1:30 PM Dubai, 3:00 PM Kolkata
        `${dateString}T10:30:00.000Z`, // 11:30 AM London, 2:30 PM Dubai, 4:00 PM Kolkata
        `${dateString}T11:30:00.000Z`, // 12:30 PM London, 3:30 PM Dubai, 5:00 PM Kolkata
        `${dateString}T12:30:00.000Z`, // 1:30 PM London, 4:30 PM Dubai, 6:00 PM Kolkata
      ];

      // Verify weekday slots
      ["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"].forEach((dateString) => {
        expect(result).toHaveTimeSlots(getExpectedSlotsForDate(dateString), {
          dateString,
          doExactMatch: false,
        });
      });

      // Verify weekend is disabled
      expect(result).toHaveDateDisabled({ dateString: "2025-06-07" });
      expect(result).toHaveDateDisabled({ dateString: "2025-06-08" });
    });

    test("should respect recurring rule in restrictionSchedule (Europe/London, useBookerTimezone=true)", async () => {
      await setupTeamAndFeatures();
      vi.setSystemTime("2025-06-01T23:30:00Z");

      const plus2DateString = "2025-06-02"; // Monday
      const plus6DateString = "2025-06-06"; // Friday

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        eventTypes: [
          {
            id: 1,
            length: 60,
            teamId: 1,
            restrictionScheduleId: 50,
            useBookerTimezone: true,
            hosts: [{ userId: 101 }],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "Test Schedule",
                timeZone: "Europe/London",
                availability: [
                  {
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T09:00:00.000Z"),
                    endTime: new Date("1970-01-01T17:00:00.000Z"),
                    date: null,
                  },
                ],
              },
            ],
            teams: [
              {
                membership: { role: "ADMIN", accepted: true },
                team: { id: 1, name: "Test Team", slug: "test-team" },
              },
            ],
          },
        ],
      };

      scenarioData.users[0].schedules.push({
        id: 50,
        name: "Test Schedule",
        timeZone: "Asia/Dubai",
        availability: [
          {
            days: [1, 2, 3, 4, 5],
            startTime: new Date("1970-01-01T10:00:00.000Z"),
            endTime: new Date("1970-01-01T18:00:00.000Z"),
            date: null,
          },
        ],
      });

      await createBookingScenario(scenarioData);

      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus6DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      // Expected slots based on:
      // - User availability: 9 AM - 5 PM London (1:30 PM - 9:30 PM Kolkata)
      // - Restriction: 10 AM - 6 PM Kolkata
      const getExpectedSlotsForDate = (dateString: string) => [
        `${dateString}T08:30:00.000Z`, // 2:00 PM Kolkata, 9:30 AM London
        `${dateString}T09:30:00.000Z`, // 3:00 PM Kolkata, 10:30 AM London
        `${dateString}T10:30:00.000Z`, // 4:00 PM Kolkata, 11:30 AM London
        `${dateString}T11:30:00.000Z`, // 5:00 PM Kolkata, 12:30 PM London
      ];

      // Verify weekday slots
      ["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"].forEach((dateString) => {
        expect(result).toHaveTimeSlots(getExpectedSlotsForDate(dateString), {
          dateString,
          doExactMatch: false,
        });
      });

      // Verify weekend is disabled
      expect(result).toHaveDateDisabled({ dateString: "2025-06-07" });
      expect(result).toHaveDateDisabled({ dateString: "2025-06-08" });
    });

    test("should return all slots when no restriction schedule is applied", async () => {
      await setupTeamAndFeatures();
      vi.setSystemTime("2025-06-01T23:30:00Z");

      const plus2DateString = "2025-06-02"; // Monday
      const plus6DateString = "2025-06-06"; // Friday

      const scenarioData: ScheduleScenario = {
        ...getBaseScenarioData(),
        eventTypes: [
          {
            id: 1,
            length: 60,
            teamId: 1,
            useBookerTimezone: false,
            hosts: [{ userId: 101 }],
          },
        ],
        users: [
          {
            ...TestData.users.example,
            id: 101,
            schedules: [
              {
                id: 1,
                name: "Test Schedule",
                timeZone: "Europe/London",
                availability: [
                  {
                    days: [0, 1, 2, 3, 4, 5, 6],
                    startTime: new Date("1970-01-01T09:00:00.000Z"),
                    endTime: new Date("1970-01-01T17:00:00.000Z"),
                    date: null,
                  },
                ],
              },
            ],
            teams: [
              {
                membership: { role: "ADMIN", accepted: true },
                team: { id: 1, name: "Test Team", slug: "test-team" },
              },
            ],
          },
        ],
      };

      await createBookingScenario(scenarioData);

      const result = await availableSlotsService.getAvailableSlots({
        input: {
          eventTypeId: 1,
          eventTypeSlug: "",
          startTime: "2025-06-01T00:00:00.000Z",
          endTime: `${plus6DateString}T23:59:59.999Z`,
          timeZone: "Asia/Kolkata",
          isTeamEvent: true,
          orgSlug: null,
        },
      });

      // Expected slots based on user's availability: 9 AM - 5 PM London
      const getExpectedSlotsForDate = (dateString: string) => [
        `${dateString}T08:30:00.000Z`, // 9:30 AM London, 2:00 PM Kolkata
        `${dateString}T09:30:00.000Z`, // 10:30 AM London, 3:00 PM Kolkata
        `${dateString}T10:30:00.000Z`, // 11:30 AM London, 4:00 PM Kolkata
        `${dateString}T11:30:00.000Z`, // 12:30 PM London, 5:00 PM Kolkata
        `${dateString}T12:30:00.000Z`, // 1:30 PM London, 6:00 PM Kolkata
        `${dateString}T13:30:00.000Z`, // 2:30 PM London, 7:00 PM Kolkata
        `${dateString}T14:30:00.000Z`, // 3:30 PM London, 8:00 PM Kolkata
      ];

      // Verify weekday slots
      ["2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05", "2025-06-06"].forEach((dateString) => {
        expect(result).toHaveTimeSlots(getExpectedSlotsForDate(dateString), {
          dateString,
          doExactMatch: false,
        });
      });

      // Verify a late evening slot (8:00 PM Kolkata, 3:30 PM London) is present
      const lateEveningSlot = `${plus2DateString}T14:30:00.000Z`;
      expect(result.slots[plus2DateString].map((s) => s.time)).toContain(lateEveningSlot);
    });
  });
});
