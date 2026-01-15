import type { SchedulingType } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SyncHostsMembershipsService } from "../SyncHostsMembershipsService";

type MockEventType = {
  id: number;
  teamId: number | null;
  schedulingType: SchedulingType;
  hosts: Array<{ userId: number }>;
  team: {
    id: number;
    parentId: number | null;
    members: Array<{ id: number; userId: number }>;
  } | null;
};

type MockHost = {
  userId: number;
  eventTypeId: number;
  isFixed: boolean;
};

const DB = {
  eventTypes: [] as MockEventType[],
  hosts: [] as MockHost[],
  hostCreationLog: [] as MockHost[],
  hostDeletionLog: [] as Array<{ eventTypeId: number; userIds: number[] }>,
};

const createMockEventType = (overrides: {
  id: number;
  teamId: number;
  schedulingType: SchedulingType;
  hosts?: Array<{ userId: number }>;
  organizationId?: number | null;
  teamMembers: Array<{ id: number; userId: number }>;
}): MockEventType => {
  const eventType: MockEventType = {
    id: overrides.id,
    teamId: overrides.teamId,
    schedulingType: overrides.schedulingType,
    hosts: overrides.hosts ?? [],
    team: {
      id: overrides.teamId,
      parentId: overrides.organizationId ?? null,
      members: overrides.teamMembers,
    },
  };
  DB.eventTypes.push(eventType);
  return eventType;
};

const createMockEventTypeWithoutTeam = (overrides: {
  id: number;
  schedulingType: SchedulingType;
}): MockEventType => {
  const eventType: MockEventType = {
    id: overrides.id,
    teamId: null,
    schedulingType: overrides.schedulingType,
    hosts: [],
    team: null,
  };
  DB.eventTypes.push(eventType);
  return eventType;
};

const mockEventTypeRepository: {
  findWithOutOfSyncHostsIncludeHostsAndTeamMembers: ReturnType<typeof vi.fn>;
} = {
  findWithOutOfSyncHostsIncludeHostsAndTeamMembers: vi.fn().mockImplementation(() => {
    return Promise.resolve(DB.eventTypes);
  }),
};

const mockHostRepository: {
  createMany: ReturnType<typeof vi.fn>;
  deleteByEventTypeAndUserIds: ReturnType<typeof vi.fn>;
} = {
  createMany: vi.fn().mockImplementation((hosts: MockHost[]) => {
    DB.hosts.push(...hosts);
    DB.hostCreationLog.push(...hosts);
    return Promise.resolve({ count: hosts.length });
  }),
  deleteByEventTypeAndUserIds: vi
    .fn()
    .mockImplementation((params: { eventTypeId: number; userIds: number[] }) => {
      const deletedCount = params.userIds.length;
      DB.hosts = DB.hosts.filter(
        (host) => !(host.eventTypeId === params.eventTypeId && params.userIds.includes(host.userId))
      );
      DB.hostDeletionLog.push(params);
      return Promise.resolve({ count: deletedCount });
    }),
};

const mockLogger: {
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
} = {
  info: vi.fn(),
  error: vi.fn(),
};

const createService = (): SyncHostsMembershipsService => {
  return new SyncHostsMembershipsService({
    eventTypeRepository: mockEventTypeRepository as never,
    hostRepository: mockHostRepository as never,
    logger: mockLogger as never,
  });
};

const expectNoChanges = (result: {
  hostsAdded: number;
  hostsRemoved: number;
  eventTypesProcessed: number;
}): void => {
  expect(result.hostsAdded).toBe(0);
  expect(result.hostsRemoved).toBe(0);
  expect(result.eventTypesProcessed).toBe(0);
};

const expectHostCreated = ({
  userId,
  eventTypeId,
  isFixed,
}: {
  userId: number;
  eventTypeId: number;
  isFixed: boolean;
}): void => {
  const host = DB.hostCreationLog.find(
    (h) => h.userId === userId && h.eventTypeId === eventTypeId && h.isFixed === isFixed
  );
  expect(host).toBeDefined();
};

const expectHostsDeleted = ({ eventTypeId, userIds }: { eventTypeId: number; userIds: number[] }): void => {
  const deletion = DB.hostDeletionLog.find(
    (d) =>
      d.eventTypeId === eventTypeId &&
      d.userIds.length === userIds.length &&
      userIds.every((id) => d.userIds.includes(id))
  );
  expect(deletion).toBeDefined();
};

describe("SyncHostsMembershipsService", () => {
  beforeEach(() => {
    DB.eventTypes = [];
    DB.hosts = [];
    DB.hostCreationLog = [];
    DB.hostDeletionLog = [];
    vi.clearAllMocks();
  });

  it("should add missing hosts for team members who are not hosts", async () => {
    createMockEventType({
      id: 1,
      teamId: 1,
      schedulingType: "ROUND_ROBIN",
      hosts: [{ userId: 1 }],
      teamMembers: [
        { id: 1, userId: 1 },
        { id: 2, userId: 2 },
      ],
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expect(result.hostsAdded).toBe(1);
    expect(result.hostsRemoved).toBe(0);
    expect(result.eventTypesProcessed).toBe(1);
    expectHostCreated({ userId: 2, eventTypeId: 1, isFixed: false });
  });

  it("should remove orphaned hosts who are no longer team members", async () => {
    createMockEventType({
      id: 1,
      teamId: 1,
      schedulingType: "ROUND_ROBIN",
      hosts: [{ userId: 1 }, { userId: 2 }],
      teamMembers: [{ id: 1, userId: 1 }],
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expect(result.hostsAdded).toBe(0);
    expect(result.hostsRemoved).toBe(1);
    expect(result.eventTypesProcessed).toBe(1);
    expectHostsDeleted({ eventTypeId: 1, userIds: [2] });
  });

  it("should set isFixed=true for COLLECTIVE scheduling type", async () => {
    createMockEventType({
      id: 1,
      teamId: 1,
      schedulingType: "COLLECTIVE",
      hosts: [],
      teamMembers: [{ id: 1, userId: 1 }],
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expect(result.hostsAdded).toBe(1);
    expectHostCreated({ userId: 1, eventTypeId: 1, isFixed: true });
  });

  it("should set isFixed=false for ROUND_ROBIN scheduling type", async () => {
    createMockEventType({
      id: 1,
      teamId: 1,
      schedulingType: "ROUND_ROBIN",
      hosts: [],
      teamMembers: [{ id: 1, userId: 1 }],
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expect(result.hostsAdded).toBe(1);
    expectHostCreated({ userId: 1, eventTypeId: 1, isFixed: false });
  });

  it("should do nothing when hosts are already in sync", async () => {
    createMockEventType({
      id: 1,
      teamId: 1,
      schedulingType: "ROUND_ROBIN",
      hosts: [{ userId: 1 }],
      teamMembers: [{ id: 1, userId: 1 }],
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expectNoChanges(result);
    expect(DB.hostCreationLog).toHaveLength(0);
    expect(DB.hostDeletionLog).toHaveLength(0);
  });

  it("should include organizationId in the result details", async () => {
    createMockEventType({
      id: 1,
      teamId: 2,
      schedulingType: "ROUND_ROBIN",
      hosts: [],
      teamMembers: [{ id: 1, userId: 1 }],
      organizationId: 1,
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expect(result.hostsAdded).toBe(1);
    expect(result.details[0].organizationId).toBe(1);
    expect(result.details[0].teamId).toBe(2);
  });

  it("should handle both adding and removing hosts in the same event type", async () => {
    createMockEventType({
      id: 1,
      teamId: 1,
      schedulingType: "ROUND_ROBIN",
      hosts: [{ userId: 1 }, { userId: 3 }],
      teamMembers: [
        { id: 1, userId: 1 },
        { id: 2, userId: 2 },
      ],
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expect(result.hostsAdded).toBe(1);
    expect(result.hostsRemoved).toBe(1);
    expect(result.eventTypesProcessed).toBe(1);
    expectHostCreated({ userId: 2, eventTypeId: 1, isFixed: false });
    expectHostsDeleted({ eventTypeId: 1, userIds: [3] });
  });

  it("should process multiple event types", async () => {
    createMockEventType({
      id: 1,
      teamId: 1,
      schedulingType: "ROUND_ROBIN",
      hosts: [],
      teamMembers: [{ id: 1, userId: 1 }],
    });

    createMockEventType({
      id: 2,
      teamId: 2,
      schedulingType: "COLLECTIVE",
      hosts: [],
      teamMembers: [{ id: 2, userId: 2 }],
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expect(result.hostsAdded).toBe(2);
    expect(result.eventTypesProcessed).toBe(2);
    expectHostCreated({ userId: 1, eventTypeId: 1, isFixed: false });
    expectHostCreated({ userId: 2, eventTypeId: 2, isFixed: true });
  });

  it("should skip event types without team", async () => {
    createMockEventTypeWithoutTeam({
      id: 1,
      schedulingType: "ROUND_ROBIN",
    });

    const service = createService();
    const result = await service.syncHostsWithMemberships({ orgIds: [1] });

    expectNoChanges(result);
  });
});
