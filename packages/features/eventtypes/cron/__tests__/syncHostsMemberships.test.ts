import { describe, it, expect, vi, beforeEach } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

vi.mock("@calcom/prisma", () => ({
  default: {
    eventType: {
      findMany: vi.fn(),
    },
    host: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import prisma from "@calcom/prisma";

import { syncHostsWithMemberships } from "../syncHostsMemberships";

describe("syncHostsWithMemberships", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should add missing hosts for team members who are not hosts", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    vi.mocked(prisma.host.createMany).mockResolvedValue({ count: 1 });

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(result.hostsRemoved).toBe(0);
    expect(result.eventTypesProcessed).toBe(1);
    expect(prisma.host.createMany).toHaveBeenCalledWith({
      data: [{ userId: 2, eventTypeId: 1, isFixed: false }],
      skipDuplicates: true,
    });
  });

  it("should remove orphaned hosts who are no longer team members", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    vi.mocked(prisma.host.deleteMany).mockResolvedValue({ count: 1 });

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(0);
    expect(result.hostsRemoved).toBe(1);
    expect(result.eventTypesProcessed).toBe(1);
    expect(prisma.host.deleteMany).toHaveBeenCalledWith({
      where: {
        eventTypeId: 1,
        userId: { in: [2] },
      },
    });
  });

  it("should set isFixed=true for COLLECTIVE scheduling type", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    vi.mocked(prisma.host.createMany).mockResolvedValue({ count: 1 });

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(prisma.host.createMany).toHaveBeenCalledWith({
      data: [{ userId: 1, eventTypeId: 1, isFixed: true }],
      skipDuplicates: true,
    });
  });

  it("should set isFixed=false for ROUND_ROBIN scheduling type", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    vi.mocked(prisma.host.createMany).mockResolvedValue({ count: 1 });

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(prisma.host.createMany).toHaveBeenCalledWith({
      data: [{ userId: 1, eventTypeId: 1, isFixed: false }],
      skipDuplicates: true,
    });
  });

  it("should do nothing when hosts are already in sync", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(0);
    expect(result.hostsRemoved).toBe(0);
    expect(result.eventTypesProcessed).toBe(0);
    expect(prisma.host.createMany).not.toHaveBeenCalled();
    expect(prisma.host.deleteMany).not.toHaveBeenCalled();
  });

  it("should include organizationId in the result details", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    vi.mocked(prisma.host.createMany).mockResolvedValue({ count: 1 });

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(result.details[0].organizationId).toBe(1);
    expect(result.details[0].teamId).toBe(2);
  });

  it("should handle both adding and removing hosts in the same event type", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    vi.mocked(prisma.host.createMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.host.deleteMany).mockResolvedValue({ count: 1 });

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(1);
    expect(result.hostsRemoved).toBe(1);
    expect(result.eventTypesProcessed).toBe(1);
  });

  it("should process multiple event types", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
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
    ] as never);

    vi.mocked(prisma.host.createMany).mockResolvedValue({ count: 1 });

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(2);
    expect(result.eventTypesProcessed).toBe(2);
  });

  it("should skip event types without team", async () => {
    vi.mocked(prisma.eventType.findMany).mockResolvedValue([
      {
        id: 1,
        teamId: null,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: [],
        team: null,
      },
    ] as never);

    const result = await syncHostsWithMemberships();

    expect(result.hostsAdded).toBe(0);
    expect(result.hostsRemoved).toBe(0);
    expect(result.eventTypesProcessed).toBe(0);
  });
});
