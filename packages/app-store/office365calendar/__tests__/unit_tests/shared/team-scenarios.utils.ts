import type { vi } from "vitest";
import { expect } from "vitest";

/**
 * Team scenario utilities for Office365 Calendar tests
 * Consolidates team event testing patterns used across multiple test files
 */

export interface TeamMember {
  id: number;
  email: string;
  name: string;
  calendars: TeamMemberCalendar[];
}

export interface TeamMemberCalendar {
  externalId: string;
  integration: string;
  primary: boolean;
  credential: {
    id: number;
    userId: number;
  };
}

export interface RoundRobinScenario {
  day: number;
  members: Array<{
    memberId: number;
    available: boolean;
    busySlots: Array<{ start: string; end: string }>;
  }>;
}

export class TeamScenariosTestUtils {
  /**
   * Creates a team with specified number of members and calendars per member
   */
  static createTeamScenario(memberCount: number, calendarsPerMember: number): TeamMember[] {
    const team: TeamMember[] = [];

    for (let i = 1; i <= memberCount; i++) {
      const member: TeamMember = {
        id: i,
        email: `member${i}@example.com`,
        name: `Team Member ${i}`,
        calendars: [],
      };

      for (let j = 1; j <= calendarsPerMember; j++) {
        member.calendars.push({
          externalId: `member${i}-cal${j}`,
          integration: "office365_calendar",
          primary: j === 1,
          credential: {
            id: i * 10 + j,
            userId: i,
          },
        });
      }

      team.push(member);
    }

    return team;
  }

  /**
   * Creates round-robin availability scenarios
   */
  static createRoundRobinScenarios(teamSize: number, daysAhead: number): RoundRobinScenario[] {
    const scenarios: RoundRobinScenario[] = [];

    for (let day = 1; day <= daysAhead; day++) {
      const dayScenario: RoundRobinScenario = {
        day,
        members: [],
      };

      for (let member = 1; member <= teamSize; member++) {
        dayScenario.members.push({
          memberId: member,
          available: Math.random() > 0.3, // 70% chance of being available
          busySlots:
            Math.random() > 0.5 ? [{ start: "2024-01-01T09:00:00Z", end: "2024-01-01T10:00:00Z" }] : [],
        });
      }

      scenarios.push(dayScenario);
    }

    return scenarios;
  }

  /**
   * Creates test expectations for team aggregation
   */
  static expectTeamAggregation(
    fetcherSpy: ReturnType<typeof vi.fn>,
    teamSize: number,
    calendarsPerMember: number
  ): void {
    const totalCalendars = teamSize * calendarsPerMember;
    const calls = fetcherSpy.mock.calls;

    // Should use batch calls for efficiency
    const batchCalls = calls.filter((call) => typeof call[0] === "string" && call[0].includes("/$batch"));
    expect(batchCalls.length).toBeGreaterThan(0);

    // Total calls should be much less than individual calendar calls
    expect(calls.length).toBeLessThan(totalCalendars);
  }

  /**
   * Creates test expectations for round-robin optimization
   */
  static expectRoundRobinOptimization(
    fetcherSpy: ReturnType<typeof vi.fn>,
    scenarios: RoundRobinScenario[]
  ): void {
    const calls = fetcherSpy.mock.calls;
    const totalMembers = scenarios.reduce((sum, scenario) => sum + scenario.members.length, 0);

    // Should optimize across all round-robin checks
    expect(calls.length).toBeLessThan(totalMembers * 2);

    // Should use batch calls
    const batchCalls = calls.filter((call) => typeof call[0] === "string" && call[0].includes("/$batch"));
    expect(batchCalls.length).toBeGreaterThan(0);
  }

  /**
   * Creates mock responses for team scenarios
   */
  static createTeamMockResponses(team: TeamMember[]) {
    return team.map((member) => ({
      memberId: member.id,
      calendars: member.calendars.map((calendar) => ({
        externalId: calendar.externalId,
        busyTimes: [
          {
            start: "2024-01-01T09:00:00Z",
            end: "2024-01-01T10:00:00Z",
            subject: `Meeting for ${member.name}`,
          },
        ],
      })),
    }));
  }

  /**
   * Validates team event processing efficiency
   */
  static validateTeamProcessingEfficiency(
    fetcherSpy: ReturnType<typeof vi.fn>,
    teamSize: number,
    expectedMaxCalls: number
  ): void {
    const calls = fetcherSpy.mock.calls;
    expect(calls.length).toBeLessThan(expectedMaxCalls);

    // Should have reasonable efficiency ratio
    const efficiencyRatio = calls.length / teamSize;
    expect(efficiencyRatio).toBeLessThan(2); // Should be less than 2 calls per team member
  }

  /**
   * Creates test expectations for team calendar batching
   */
  static expectTeamCalendarBatching(fetcherSpy: ReturnType<typeof vi.fn>, team: TeamMember[]): void {
    const calls = fetcherSpy.mock.calls;
    const totalCalendars = team.reduce((sum, member) => sum + member.calendars.length, 0);

    // Should batch calendars efficiently
    expect(calls.length).toBeLessThan(totalCalendars / 2);

    // Should use batch API calls
    const batchCalls = calls.filter((call) => typeof call[0] === "string" && call[0].includes("/$batch"));
    expect(batchCalls.length).toBeGreaterThan(0);
  }

  /**
   * Creates comprehensive team test scenarios
   */
  static createComprehensiveTeamScenarios() {
    return [
      {
        name: "Small team (3 members, 1 calendar each)",
        team: this.createTeamScenario(3, 1),
        expectedOptimization: "Should use minimal API calls",
      },
      {
        name: "Medium team (5 members, 2 calendars each)",
        team: this.createTeamScenario(5, 2),
        expectedOptimization: "Should batch calendars by member",
      },
      {
        name: "Large team (10 members, 3 calendars each)",
        team: this.createTeamScenario(10, 3),
        expectedOptimization: "Should use advanced batching strategies",
      },
      {
        name: "Mixed team (varying calendar counts)",
        team: [
          ...this.createTeamScenario(2, 1),
          ...this.createTeamScenario(2, 2),
          ...this.createTeamScenario(1, 3),
        ],
        expectedOptimization: "Should handle varying calendar counts efficiently",
      },
    ];
  }
}
