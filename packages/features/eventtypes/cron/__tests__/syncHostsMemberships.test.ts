import { describe, it, expect, vi, beforeEach } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

import { SyncHostsMembershipsService } from "../../services/SyncHostsMembershipsService";

const mockEventTypeRepository = {
  findWithAssignAllTeamMembersIncludeHostsAndTeamMembers: vi.fn(),
};

const mockHostRepository = {
  createMany: vi.fn(),
  deleteByEventTypeAndUserIds: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
};

function createService() {
  return new SyncHostsMembershipsService({
    eventTypeRepository: mockEventTypeRepository as never,
    hostRepository: mockHostRepository as never,
    logger: mockLogger as never,
  });
}

describe("SyncHostsMembershipsService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should add missing hosts for team members who are not hosts", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [{ userId: 1 }],
        team: {
          id: 1,
          parentId: null,
          members: [
            { id: 1, userId: 1 },
            { id: 2, userId: 2 },
          ],
        },
      },
    ]);

    mockHostRepository.createMany.mockResolvedValue({ count: 1 });

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(result.hostsRemoved).toBe(0);
    expect(result.eventTypesProcessed).toBe(1);
    expect(mockHostRepository.createMany).toHaveBeenCalledWith([
      { userId: 2, eventTypeId: 1, isFixed: false },
    ]);
  });

  it("should remove orphaned hosts who are no longer team members", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [{ userId: 1 }, { userId: 2 }],
        team: {
          id: 1,
          parentId: null,
          members: [{ id: 1, userId: 1 }],
        },
      },
    ]);

    mockHostRepository.deleteByEventTypeAndUserIds.mockResolvedValue({ count: 1 });

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(0);
    expect(result.hostsRemoved).toBe(1);
    expect(result.eventTypesProcessed).toBe(1);
    expect(mockHostRepository.deleteByEventTypeAndUserIds).toHaveBeenCalledWith(1, [2]);
  });

  it("should set isFixed=true for COLLECTIVE scheduling type", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        schedulingType: SchedulingType.COLLECTIVE,
        hosts: [],
        team: {
          id: 1,
          parentId: null,
          members: [{ id: 1, userId: 1 }],
        },
      },
    ]);

    mockHostRepository.createMany.mockResolvedValue({ count: 1 });

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(mockHostRepository.createMany).toHaveBeenCalledWith([
      { userId: 1, eventTypeId: 1, isFixed: true },
    ]);
  });

  it("should set isFixed=false for ROUND_ROBIN scheduling type", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [],
        team: {
          id: 1,
          parentId: null,
          members: [{ id: 1, userId: 1 }],
        },
      },
    ]);

    mockHostRepository.createMany.mockResolvedValue({ count: 1 });

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(mockHostRepository.createMany).toHaveBeenCalledWith([
      { userId: 1, eventTypeId: 1, isFixed: false },
    ]);
  });

  it("should do nothing when hosts are already in sync", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [{ userId: 1 }],
        team: {
          id: 1,
          parentId: null,
          members: [{ id: 1, userId: 1 }],
        },
      },
    ]);

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(0);
    expect(result.hostsRemoved).toBe(0);
    expect(result.eventTypesProcessed).toBe(0);
    expect(mockHostRepository.createMany).not.toHaveBeenCalled();
    expect(mockHostRepository.deleteByEventTypeAndUserIds).not.toHaveBeenCalled();
  });

  it("should include organizationId in the result details", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 2,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [],
        team: {
          id: 2,
          parentId: 1,
          members: [{ id: 1, userId: 1 }],
        },
      },
    ]);

    mockHostRepository.createMany.mockResolvedValue({ count: 1 });

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(result.details[0].organizationId).toBe(1);
    expect(result.details[0].teamId).toBe(2);
  });

  it("should handle both adding and removing hosts in the same event type", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [{ userId: 1 }, { userId: 3 }],
        team: {
          id: 1,
          parentId: null,
          members: [
            { id: 1, userId: 1 },
            { id: 2, userId: 2 },
          ],
        },
      },
    ]);

    mockHostRepository.createMany.mockResolvedValue({ count: 1 });
    mockHostRepository.deleteByEventTypeAndUserIds.mockResolvedValue({ count: 1 });

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(result.hostsRemoved).toBe(1);
    expect(result.eventTypesProcessed).toBe(1);
  });

  it("should process multiple event types", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: 1,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [],
        team: {
          id: 1,
          parentId: null,
          members: [{ id: 1, userId: 1 }],
        },
      },
      {
        id: 2,
        teamId: 2,
        schedulingType: SchedulingType.COLLECTIVE,
        hosts: [],
        team: {
          id: 2,
          parentId: null,
          members: [{ id: 2, userId: 2 }],
        },
      },
    ]);

    mockHostRepository.createMany.mockResolvedValue({ count: 1 });

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(2);
    expect(result.eventTypesProcessed).toBe(2);
  });

  it("should skip event types without team", async () => {
    mockEventTypeRepository.findWithAssignAllTeamMembersIncludeHostsAndTeamMembers.mockResolvedValue([
      {
        id: 1,
        teamId: null,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [],
        team: null,
      },
    ]);

    const service = createService();
    const result = await service.syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(0);
    expect(result.hostsRemoved).toBe(0);
    expect(result.eventTypesProcessed).toBe(0);
  });
});
