import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TGetHostsForAssignmentInputSchema } from "./getHostsForAssignment.schema";

type GetHostsForAssignmentInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetHostsForAssignmentInputSchema;
};

export type AssignmentHost = {
  userId: number;
  isFixed: boolean;
  priority: number;
  weight: number;
  scheduleId: number | null;
  groupId: string | null;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type GetHostsForAssignmentResponse = {
  hosts: AssignmentHost[];
  nextCursor: number | undefined;
  hasMore: boolean;
  hasFixedHosts?: boolean;
};

export const getHostsForAssignmentHandler = async ({
  ctx,
  input,
}: GetHostsForAssignmentInput): Promise<GetHostsForAssignmentResponse> => {
  const { eventTypeId, cursor, limit, search, memberUserIds } = input;

  const hostRepository = new HostRepository(ctx.prisma);
  const { items, nextCursor, hasMore, hasFixedHosts } =
    await hostRepository.findHostsForAssignmentPaginated({
      eventTypeId,
      cursor: cursor ?? undefined,
      limit,
      search,
      memberUserIds,
    });

  const hosts: AssignmentHost[] = items.map((item) => ({
    userId: item.userId,
    isFixed: item.isFixed,
    priority: item.priority ?? 0,
    weight: item.weight ?? 100,
    scheduleId: item.scheduleId,
    groupId: item.groupId,
    name: item.user.name,
    email: item.user.email,
    avatarUrl: item.user.avatarUrl,
  }));

  return { hosts, nextCursor, hasMore, ...(hasFixedHosts !== undefined && { hasFixedHosts }) };
};
