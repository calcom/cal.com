import { vi, it, describe, expect, afterEach } from "vitest";
import type { Mock } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";
import { findQualifiedHosts } from "./findQualifiedHosts";

// Mock the filterHostsByLeadThreshold function
vi.mock("./filterHostsByLeadThreshold", () => {
  return {
    filterHostsByLeadThreshold: vi.fn(),
  };
});

// Clear call history after each test
afterEach(() => {
  (filterHostsByLeadThreshold as Mock).mockClear();
});

describe("findQualifiedHosts", async () => {
  it("should return qualified hosts based on mock of filterHostsByLeadThreshold", async () => {
    const hosts = [
      {
        isFixed: true,
        createdAt: new Date(),
        user: {
          id: 2,
          email: "hellouser2@email.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        priority: undefined,
        weight: undefined,
      },
      {
        isFixed: false,
        createdAt: new Date(),
        user: {
          id: 1,
          email: "hellouser@email.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        priority: undefined,
        weight: undefined,
      },
    ];

    // Configure the mock return value
    (filterHostsByLeadThreshold as Mock).mockResolvedValue(hosts);

    // Define the input for the test
    const eventType = {
      id: 1,
      hosts,
      users: [],
      schedulingType: SchedulingType.ROUND_ROBIN,
      maxLeadThreshold: null,
      rescheduleWithSameRoundRobinHost: true,
      assignAllTeamMembers: true,
      assignRRMembersUsingSegment: false,
      rrSegmentQueryValue: null,
      isRRWeightsEnabled: false,
      team: {
        id: 1,
        parentId: null,
      },
    };

    // Call the function under test
    const result = await findQualifiedHosts({
      eventType,
      routedTeamMemberIds: [],
      rescheduleUid: null,
      contactOwnerEmail: null,
    });

    // Verify the result
    expect(result).toStrictEqual({ qualifiedHosts: hosts, fallbackHosts: [] });
  });

  it("should return hosts after valid input with users", async () => {
    const users = [
      {
        email: "hello@gmail.com",
        id: 1,
        credentials: [],
        userLevelSelectedCalendars: [],
      },
      {
        email: "hello2@gmail.com",
        id: 2,
        credentials: [],
        userLevelSelectedCalendars: [],
      },
    ];

    // Define the input for the test
    const eventType = {
      id: 1,
      hosts: [],
      users,
      schedulingType: null,
      maxLeadThreshold: null,
      rescheduleWithSameRoundRobinHost: true,
      assignAllTeamMembers: true,
      assignRRMembersUsingSegment: false,
      rrSegmentQueryValue: null,
      isRRWeightsEnabled: false,
      team: {
        id: 1,
        parentId: null,
      },
    };

    // Call the function under test
    const result = await findQualifiedHosts({
      eventType,
      routedTeamMemberIds: [],
      rescheduleUid: null,
      contactOwnerEmail: null,
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedHosts: users.map((user) => ({
        user: user,
        isFixed: true,
        email: user.email,
        createdAt: null,
      })),
    });

    expect(filterHostsByLeadThreshold).not.toHaveBeenCalled();
  });

  // TODO: Find out why this fails.
  it.skip("should return only the crm contact owner match & other users as fallback", async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const hosts = [
      {
        weight: 100,
        priority: 2,
        createdAt: oneYearAgo,
        isFixed: false,
        user: {
          email: "hello1@gmail.com",
          id: 1,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        weight: 100,
        priority: 2,
        createdAt: oneYearAgo,
        isFixed: false,
        user: {
          email: "hello2@gmail.com",
          id: 2,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        weight: 100,
        priority: 2,
        createdAt: oneYearAgo,
        isFixed: false,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

    // Define the input for the test
    const eventType = {
      id: 1,
      hosts,
      users: [],
      schedulingType: SchedulingType.ROUND_ROBIN,
      maxLeadThreshold: null,
      rescheduleWithSameRoundRobinHost: true,
      assignAllTeamMembers: true,
      assignRRMembersUsingSegment: false,
      rrSegmentQueryValue: null,
      isRRWeightsEnabled: false,
      team: {
        id: 1,
        parentId: null,
      },
    };

    // Call the function under test
    const result = await findQualifiedHosts({
      eventType,
      routedTeamMemberIds: [],
      rescheduleUid: null,
      contactOwnerEmail: "hello1@gmail.com",
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedHosts: [
        {
          ...hosts[0],
        },
      ],
      fallbackHosts: [
        {
          ...hosts[1],
          disqualifyReason: "NotContactOwner",
        },
        {
          ...hosts[2],
          disqualifyReason: "NotContactOwner",
        },
      ],
    });
  });

  it("should return only routed members as fallback for crm contact owner match", async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const hosts = [
      {
        isFixed: false,
        createdAt: oneYearAgo,
        user: {
          email: "hello1@gmail.com",
          id: 1,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        isFixed: false,
        createdAt: oneYearAgo,
        user: {
          email: "hello2@gmail.com",
          id: 2,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        isFixed: false,
        createdAt: oneYearAgo,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

    // Define the input for the test
    const eventType = {
      id: 1,
      hosts,
      users: [],
      schedulingType: SchedulingType.ROUND_ROBIN,
      maxLeadThreshold: null,
      rescheduleWithSameRoundRobinHost: true,
      assignAllTeamMembers: true,
      assignRRMembersUsingSegment: false,
      rrSegmentQueryValue: null,
      isRRWeightsEnabled: false,
      team: {
        id: 1,
        parentId: null,
      },
    };

    // Call the function under test
    const result = await findQualifiedHosts({
      eventType,
      routedTeamMemberIds: [1],
      rescheduleUid: null,
      contactOwnerEmail: "hello3@gmail.com",
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedHosts: [
        {
          weight: undefined,
          priority: undefined,
          isFixed: false,
          createdAt: oneYearAgo,
          user: {
            id: 3,
            email: "hello3@gmail.com",
            credentials: [],
            userLevelSelectedCalendars: [],
          },
        },
      ],
      fallbackHosts: [
        {
          weight: undefined,
          priority: undefined,
          isFixed: false,
          createdAt: oneYearAgo,
          disqualifyReason: "NotContactOwner",
          user: {
            email: "hello1@gmail.com",
            id: 1,
            credentials: [],
            userLevelSelectedCalendars: [],
          },
        },
      ],
    });
  });
});
