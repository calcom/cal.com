import prismaMock from "../../../../../tests/libs/__mocks__/prismaMock";

import { vi, it, describe, expect, afterEach } from "vitest";
import type { Mock } from "vitest";

import { getQualifiedHostsService } from "@calcom/features/di/containers/QualifiedHosts";
import * as getRoutedUsers from "@calcom/features/users/lib/getRoutedUsers";
import { RRResetInterval, SchedulingType } from "@calcom/prisma/enums";

import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";

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

const qualifiedHostsService = getQualifiedHostsService();
describe("findQualifiedHostsWithDelegationCredentials", async () => {
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
        groupId: null,
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
        groupId: null,
      },
      {
        isFixed: false,
        createdAt: new Date(),
        user: {
          id: 3,
          email: "hellouser3@email.com",
          credentials: [],
          userLevelSelectedCalendars: [],
        },
        priority: undefined,
        weight: undefined,
        groupId: null,
      },
    ];

    const rrHosts = hosts.filter((host) => !host.isFixed);
    const fixedHosts = hosts.filter((host) => host.isFixed);
    const rrHostsAfterFairness = [rrHosts[2]];

    // Configure the mock return value
    (filterHostsByLeadThreshold as Mock).mockResolvedValue(rrHostsAfterFairness);

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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };

    // Call the function under test
    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [],
      rescheduleUid: null,
      contactOwnerEmail: null,
      routingFormResponse: null,
    });

    // Verify the result
    expect(result).toStrictEqual({
      qualifiedRRHosts: rrHostsAfterFairness,
      fixedHosts,
      allFallbackRRHosts: rrHosts,
    });
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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };

    // Call the function under test
    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [],
      rescheduleUid: null,
      contactOwnerEmail: null,
      routingFormResponse: null,
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedRRHosts: [],
      fixedHosts: users.map((user) => ({
        user: user,
        isFixed: true,
        email: user.email,
        createdAt: null,
      })),
    });

    expect(filterHostsByLeadThreshold).not.toHaveBeenCalled();
  });

  it("should return only the crm contact owner match & other users + contact owner as fallback ", async () => {
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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };

    // Call the function under test
    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [],
      rescheduleUid: null,
      contactOwnerEmail: "hello1@gmail.com",
      routingFormResponse: null,
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedRRHosts: [
        {
          ...hosts[0],
        },
      ],
      allFallbackRRHosts: hosts,
      fixedHosts: [],
    });
  });

  // it("should return only the crm contact owner match & other users + contact owner as fallback (with routing and segment filtering)", async () => {

  // });

  it("should return only routed members + contact owner as fallback for crm contact owner match", async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const hosts = [
      {
        isFixed: false,
        createdAt: oneYearAgo,
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

    (filterHostsByLeadThreshold as Mock).mockResolvedValue([hosts[0], hosts[1]]);

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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };

    // Call the function under test
    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [1],
      rescheduleUid: null,
      contactOwnerEmail: "hello3@gmail.com",
      routingFormResponse: null,
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedRRHosts: [hosts[2]],
      allFallbackRRHosts: [hosts[0], hosts[2]],
      fixedHosts: [],
    });
  });

  it("if it's a reschedule with same host, it should only return this host and the fixed hosts", async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const hosts = [
      {
        isFixed: false,
        createdAt: oneYearAgo,
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
        user: {
          email: "hello2@gmail.com",
          id: 2,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        isFixed: true,
        createdAt: oneYearAgo,
        weight: undefined,
        priority: undefined,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };
    prismaMock.booking.findFirst.mockResolvedValue({ userId: 2 });

    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [],
      rescheduleUid: "recheduleUid",
      contactOwnerEmail: null,
      routingFormResponse: null,
    });

    expect(result).toEqual({
      qualifiedRRHosts: [hosts[1]],
      fixedHosts: [hosts[2]],
    });
  });

  it("should return early if segment matching results in only one host", async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const hosts = [
      {
        isFixed: false,
        createdAt: oneYearAgo,
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };

    const findMatchingHostsSpy = vi
      .spyOn(getRoutedUsers, "findMatchingHostsWithEventSegment")
      .mockImplementation(async () => [hosts[0]]);

    // Call the function under test
    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [0, 1, 2],
      rescheduleUid: null,
      contactOwnerEmail: null,
      routingFormResponse: null,
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedRRHosts: [hosts[0]],
      fixedHosts: [],
    });

    // Verify that findMatchingHostsWithEventSegment was called with correct parameters
    expect(findMatchingHostsSpy).toHaveBeenCalledWith({
      eventType,
      hosts: hosts.filter((host) => !host.isFixed), // Only round-robin hosts should be passed
    });

    // Verify that filterHostsByLeadThreshold was not called since we returned early
    expect(filterHostsByLeadThreshold).not.toHaveBeenCalled();

    // Verify that allFallbackRRHosts is not present in the result
    expect(result).not.toHaveProperty("allFallbackRRHosts");
  });

  it("should filter for segment matching and routed team member ids", async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const hosts = [
      {
        isFixed: false,
        createdAt: oneYearAgo,
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };

    vi.spyOn(getRoutedUsers, "findMatchingHostsWithEventSegment").mockImplementation(async () => [
      hosts[0],
      hosts[1],
    ]);

    // Call the function under test
    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [2, 3],
      rescheduleUid: null,
      contactOwnerEmail: null,
      routingFormResponse: null,
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedRRHosts: [hosts[1]],
      fixedHosts: [],
    });
  });

  it("should filter for fairness and return fallback with segment filtering and routed team member ids", async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const hosts = [
      {
        isFixed: false,
        createdAt: oneYearAgo,
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
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
        weight: undefined,
        priority: undefined,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
      {
        isFixed: false,
        createdAt: oneYearAgo,
        weight: undefined,
        priority: undefined,
        user: {
          email: "hello3@gmail.com",
          id: 3,
          credentials: [],
          userLevelSelectedCalendars: [],
        },
      },
    ];

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
        rrResetInterval: RRResetInterval.MONTH,
      },
    };

    vi.spyOn(getRoutedUsers, "findMatchingHostsWithEventSegment").mockImplementation(async () => [
      hosts[0],
      hosts[1],
      hosts[2],
    ]);

    const rrHostsAfterFairness = [hosts[2]];

    // Configure the mock return value
    (filterHostsByLeadThreshold as Mock).mockResolvedValue(rrHostsAfterFairness);

    // Call the function under test
    const result = await qualifiedHostsService.findQualifiedHostsWithDelegationCredentials({
      eventType,
      routedTeamMemberIds: [2, 3],
      rescheduleUid: null,
      contactOwnerEmail: null,
      routingFormResponse: null,
    });

    // Verify the result
    expect(result).toEqual({
      qualifiedRRHosts: [hosts[2]],
      allFallbackRRHosts: [hosts[1], hosts[2]],
      fixedHosts: [],
    });
  });
});
