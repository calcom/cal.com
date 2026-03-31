import type { AllTeamMembersResponse } from "@calcom/features/membership/services/MembershipService";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAllTeamMembers = vi.fn<[], Promise<AllTeamMembersResponse>>();

vi.mock("@calcom/features/membership/repositories/PrismaMembershipRepository", () => ({
  PrismaMembershipRepository: class {},
}));

vi.mock("@calcom/features/membership/services/MembershipService", () => {
  return {
    MembershipService: class {
      getAllTeamMembers = mockGetAllTeamMembers;
    },
  };
});

import { getAllTeamMembersHandler } from "./getAllTeamMembers.handler";

beforeEach(() => {
  vi.clearAllMocks();
});

function createMockCtx(findUniqueResult: unknown = null): {
  user: never;
  prisma: { eventType: { findUnique: ReturnType<typeof vi.fn> } } & never;
} {
  return {
    user: { id: 1 } as never,
    prisma: {
      eventType: {
        findUnique: vi.fn().mockResolvedValue(findUniqueResult),
      },
    } as never,
  };
}

describe("getAllTeamMembersHandler", () => {
  it("should throw BAD_REQUEST when event type is not found", async () => {
    const ctx = createMockCtx(null);

    await expect(getAllTeamMembersHandler({ ctx, input: { eventTypeId: 999 } })).rejects.toThrow(TRPCError);

    await expect(getAllTeamMembersHandler({ ctx, input: { eventTypeId: 999 } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("should throw BAD_REQUEST when event type has no teamId", async () => {
    const ctx = createMockCtx({ teamId: null });

    await expect(getAllTeamMembersHandler({ ctx, input: { eventTypeId: 1 } })).rejects.toThrow(TRPCError);

    await expect(getAllTeamMembersHandler({ ctx, input: { eventTypeId: 1 } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Event type is not a team event",
    });
  });

  it("should look up the event type by id and select only teamId", async () => {
    const ctx = createMockCtx({ teamId: 42 });
    mockGetAllTeamMembers.mockResolvedValue({ members: [] });

    await getAllTeamMembersHandler({ ctx, input: { eventTypeId: 100 } });

    expect(ctx.prisma.eventType.findUnique).toHaveBeenCalledWith({
      where: { id: 100 },
      select: { teamId: true },
    });
  });

  it("should delegate to MembershipService with the correct teamId", async () => {
    const ctx = createMockCtx({ teamId: 42 });

    const expectedResponse: AllTeamMembersResponse = {
      members: [
        {
          userId: 1,
          name: "Alice",
          email: "alice@test.com",
          avatarUrl: null,
          username: "alice",
          defaultScheduleId: 10,
          role: MembershipRole.ADMIN,
        },
      ],
    };
    mockGetAllTeamMembers.mockResolvedValue(expectedResponse);

    const result = await getAllTeamMembersHandler({
      ctx,
      input: { eventTypeId: 100 },
    });

    expect(mockGetAllTeamMembers).toHaveBeenCalledWith({ teamId: 42 });
    expect(result).toEqual(expectedResponse);
  });

  it("should return empty members for a team with no accepted members", async () => {
    const ctx = createMockCtx({ teamId: 10 });
    mockGetAllTeamMembers.mockResolvedValue({ members: [] });

    const result = await getAllTeamMembersHandler({
      ctx,
      input: { eventTypeId: 50 },
    });

    expect(result.members).toHaveLength(0);
  });
});
