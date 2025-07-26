import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "vitest-fetch-mock";

import logger from "@calcom/lib/logger";

import { getTokenObjectFromCredential } from "../../../_utils/oauth/getTokenObjectFromCredential";
import Office365CalendarService from "../../lib/CalendarService";
import { getOfficeAppKeys } from "../../lib/getOfficeAppKeys";
import { TEST_DATES, generateTestDates } from "../dates";
import { defaultFetcherMockImplementation } from "../mock_utils/mocks";
import { createMultipleCredentialsForTeam } from "../mock_utils/utils";
import { TeamScenariosTestUtils } from "./shared/team-scenarios.utils";

// Mock dependencies
vi.mock("../../../_utils/oauth/getTokenObjectFromCredential");
vi.mock("../../lib/getOfficeAppKeys");

const log = logger.getSubLogger({ prefix: ["TeamEvents.test"] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTokenObjectFromCredential).mockReturnValue({
    access_token: "mock_access_token",
    refresh_token: "mock_refresh_token",
    expires_at: new Date(Date.now() + 3600 * 1000),
  });
  vi.mocked(getOfficeAppKeys).mockResolvedValue({
    client_id: "mock_client_id",
    client_secret: "mock_client_secret",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Office365TeamEvents - Round-Robin and Team Optimization", () => {
  describe("Round-Robin Scheduling", () => {
    test("should optimize round-robin member selection", async () => {
      const teamSize = 4;
      const team = TeamScenariosTestUtils.createTeamScenario(teamSize, 1);
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Simulate round-robin selection across multiple days
      const roundRobinScenarios = TeamScenariosTestUtils.createRoundRobinScenarios(teamSize, 5);

      for (const scenario of roundRobinScenarios.slice(0, 3)) {
        const dayCalendars = team.map((member) => ({
          externalId: member.calendars[0].externalId,
          integration: "office365_calendar",
          userId: member.id,
        }));

        await calendarService.getAvailability(
          `2024-01-0${scenario.day}T00:00:00Z`,
          `2024-01-0${scenario.day}T23:59:59Z`,
          dayCalendars,
          false
        );
      }

      // Use shared utilities for validation
      TeamScenariosTestUtils.expectRoundRobinOptimization(fetcherSpy as any, roundRobinScenarios.slice(0, 3));

      fetcherSpy.mockRestore();
    });

    test("should handle member availability conflicts in round-robin", async () => {
      const teamSize = 3;
      const team = TeamScenariosTestUtils.createTeamScenario(teamSize, 1);
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);

      // Mock different availability responses for each member
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(async (endpoint, options) => {
          if (typeof endpoint === "string") {
            if (endpoint.includes("member1")) {
              // Member 1 has conflicts
              return {
                status: 200,
                json: async () => ({
                  responses: [
                    {
                      id: "0",
                      status: 200,
                      body: {
                        value: [
                          {
                            start: { dateTime: TEST_DATES.TOMORROW_9AM },
                            end: { dateTime: TEST_DATES.TOMORROW_10AM },
                            subject: "Busy Meeting",
                          },
                        ],
                      },
                    },
                  ],
                }),
              };
            } else if (endpoint.includes("member2")) {
              // Member 2 is available
              return {
                status: 200,
                json: async () => ({
                  responses: [
                    {
                      id: "0",
                      status: 200,
                      body: { value: [] }, // No conflicts
                    },
                  ],
                }),
              };
            }
          }
          return defaultFetcherMockImplementation(endpoint, options);
        });

      const dayCalendars = team.map((member) => ({
        externalId: member.calendars[0].externalId,
        integration: "office365_calendar",
        userId: member.id,
      }));

      const results = await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        dayCalendars,
        false
      );

      expect(results).toBeDefined();
      expect(fetcherSpy).toHaveBeenCalled();

      fetcherSpy.mockRestore();
    });
  });

  describe("Team Calendar Aggregation", () => {
    test("should efficiently aggregate calendars across team members", async () => {
      const teamSize = 5;
      const calendarsPerMember = 2;
      const team = TeamScenariosTestUtils.createTeamScenario(teamSize, calendarsPerMember);
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Get all calendars from all team members
      const allCalendars = team.flatMap((member) =>
        member.calendars.map((cal) => ({
          externalId: cal.externalId,
          integration: "office365_calendar",
          userId: member.id,
        }))
      );

      await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        allCalendars,
        false
      );

      // Use shared utilities for validation
      TeamScenariosTestUtils.expectTeamAggregation(fetcherSpy as any, teamSize, calendarsPerMember);

      fetcherSpy.mockRestore();
    });

    test("should handle varying calendar counts per team member", async () => {
      // Create team with varying calendar counts per member
      const teamCredentials = await createMultipleCredentialsForTeam(3);
      const mixedTeam = [
        ...TeamScenariosTestUtils.createTeamScenario(1, 1), // Member 1: 1 calendar
        ...TeamScenariosTestUtils.createTeamScenario(1, 2), // Member 2: 2 calendars
        ...TeamScenariosTestUtils.createTeamScenario(1, 3), // Member 3: 3 calendars
      ];

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const allCalendars = mixedTeam.flatMap((member) =>
        member.calendars.map((cal) => ({
          externalId: cal.externalId,
          integration: "office365_calendar",
          userId: member.id,
        }))
      );

      await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        allCalendars,
        false
      );

      // Should handle varying calendar counts efficiently
      TeamScenariosTestUtils.expectTeamCalendarBatching(fetcherSpy as any, mixedTeam);

      fetcherSpy.mockRestore();
    });

    test("should optimize team event scheduling with multiple event types", async () => {
      const teamSize = 4;
      const team = TeamScenariosTestUtils.createTeamScenario(teamSize, 2);
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Simulate different event types requiring different team members
      const eventTypeScenarios = [
        {
          name: "Sales Call",
          requiredMembers: team.slice(0, 2), // First 2 members
          duration: 30,
        },
        {
          name: "Technical Review",
          requiredMembers: team.slice(1, 4), // Last 3 members
          duration: 60,
        },
        {
          name: "All Hands",
          requiredMembers: team, // All members
          duration: 90,
        },
      ];

      for (const scenario of eventTypeScenarios) {
        const scenarioCalendars = scenario.requiredMembers.flatMap((member) =>
          member.calendars.map((cal) => ({
            externalId: cal.externalId,
            integration: "office365_calendar",
            userId: member.id,
          }))
        );

        await calendarService.getAvailability(
          TEST_DATES.AVAILABILITY_START,
          TEST_DATES.AVAILABILITY_END,
          scenarioCalendars,
          false
        );
      }

      // Should optimize across all event type scenarios
      TeamScenariosTestUtils.validateTeamProcessingEfficiency(
        fetcherSpy as any,
        teamSize,
        eventTypeScenarios.length * 3
      );

      fetcherSpy.mockRestore();
    });
  });

  describe("Team Availability Patterns", () => {
    test("should handle team availability patterns efficiently", async () => {
      const teamSize = 3;
      const team = TeamScenariosTestUtils.createTeamScenario(teamSize, 1);
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Test different availability patterns
      const availabilityPatterns = [
        {
          name: "Morning availability",
          timeRange: { start: "09:00", end: "12:00" },
        },
        {
          name: "Afternoon availability",
          timeRange: { start: "13:00", end: "17:00" },
        },
        {
          name: "Extended hours",
          timeRange: { start: "08:00", end: "18:00" },
        },
      ];

      for (const pattern of availabilityPatterns) {
        const dayCalendars = team.map((member) => ({
          externalId: member.calendars[0].externalId,
          integration: "office365_calendar",
          userId: member.id,
        }));

        const startTime = `2024-01-01T${pattern.timeRange.start}:00Z`;
        const endTime = `2024-01-01T${pattern.timeRange.end}:00Z`;

        await calendarService.getAvailability(startTime, endTime, dayCalendars, false);
      }

      // Should handle all patterns efficiently
      TeamScenariosTestUtils.validateTeamProcessingEfficiency(
        fetcherSpy as any,
        teamSize,
        availabilityPatterns.length * 2
      );

      fetcherSpy.mockRestore();
    });

    test("should optimize recurring team meeting scenarios", async () => {
      const teamSize = 4;
      const team = TeamScenariosTestUtils.createTeamScenario(teamSize, 1);
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Simulate recurring meeting patterns using available method
      const recurringPatterns = generateTestDates.getRoundRobinDates(7); // 7 days

      for (const dateInfo of recurringPatterns.slice(0, 5)) {
        const dayCalendars = team.map((member) => ({
          externalId: member.calendars[0].externalId,
          integration: "office365_calendar",
          userId: member.id,
        }));

        await calendarService.getAvailability(
          `${dateInfo.date}T09:00:00Z`,
          `${dateInfo.date}T10:00:00Z`,
          dayCalendars,
          false
        );
      }

      // Should optimize recurring patterns
      TeamScenariosTestUtils.validateTeamProcessingEfficiency(fetcherSpy as any, teamSize, 10);

      fetcherSpy.mockRestore();
    });
  });

  describe("Large Team Scenarios", () => {
    test("should handle large team efficiently", async () => {
      const largeTeamSize = 15;
      const team = TeamScenariosTestUtils.createTeamScenario(largeTeamSize, 2);
      const teamCredentials = await createMultipleCredentialsForTeam(largeTeamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const allCalendars = team.flatMap((member) =>
        member.calendars.map((cal) => ({
          externalId: cal.externalId,
          integration: "office365_calendar",
          userId: member.id,
        }))
      );

      await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        allCalendars,
        false
      );

      // Should handle large teams efficiently
      TeamScenariosTestUtils.expectTeamAggregation(fetcherSpy as any, largeTeamSize, 2);

      fetcherSpy.mockRestore();
    });

    test("should optimize department-level team events", async () => {
      const departmentSize = 20;
      const team = TeamScenariosTestUtils.createTeamScenario(departmentSize, 1);
      const teamCredentials = await createMultipleCredentialsForTeam(departmentSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Simulate department-wide availability check
      const departmentCalendars = team.map((member) => ({
        externalId: member.calendars[0].externalId,
        integration: "office365_calendar",
        userId: member.id,
      }));

      await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        departmentCalendars,
        false
      );

      // Should handle department-level efficiently
      TeamScenariosTestUtils.validateTeamProcessingEfficiency(
        fetcherSpy as any,
        departmentSize,
        departmentSize / 2
      );

      fetcherSpy.mockRestore();
    });
  });

  describe("Team Event Edge Cases", () => {
    test("should handle team members with no calendars", async () => {
      const teamSize = 3;
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      // Create team where some members have no calendars
      const partialTeam = [
        ...TeamScenariosTestUtils.createTeamScenario(2, 1), // 2 members with calendars
        {
          id: 3,
          email: "member3@example.com",
          name: "Team Member 3",
          calendars: [], // No calendars
        },
      ];

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      const availableCalendars = partialTeam
        .filter((member) => member.calendars.length > 0)
        .flatMap((member) =>
          member.calendars.map((cal) => ({
            externalId: cal.externalId,
            integration: "office365_calendar",
            userId: member.id,
          }))
        );

      await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        availableCalendars,
        false
      );

      // Should handle gracefully
      expect(fetcherSpy).toHaveBeenCalled();

      fetcherSpy.mockRestore();
    });

    test("should handle mixed calendar integrations in team", async () => {
      const teamSize = 3;
      const teamCredentials = await createMultipleCredentialsForTeam(teamSize);

      const calendarService = new Office365CalendarService(teamCredentials[0]);
      const fetcherSpy = vi
        .spyOn(calendarService, "fetcher" as any)
        .mockImplementation(defaultFetcherMockImplementation);

      // Mix of Office365 and other calendar types
      const mixedCalendars = [
        { externalId: "office365-cal1", integration: "office365_calendar", userId: 1 },
        { externalId: "office365-cal2", integration: "office365_calendar", userId: 2 },
        { externalId: "google-cal1", integration: "google_calendar", userId: 3 }, // Different integration
      ];

      // Filter to only Office365 calendars for this service
      const office365Calendars = mixedCalendars.filter((cal) => cal.integration === "office365_calendar");

      await calendarService.getAvailability(
        TEST_DATES.AVAILABILITY_START,
        TEST_DATES.AVAILABILITY_END,
        office365Calendars,
        false
      );

      // Should handle only relevant calendars
      expect(fetcherSpy).toHaveBeenCalled();

      fetcherSpy.mockRestore();
    });
  });
});
