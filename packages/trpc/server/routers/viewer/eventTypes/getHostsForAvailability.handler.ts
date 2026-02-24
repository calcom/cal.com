import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TGetHostsForAvailabilityInputSchema } from "./getHostsForAvailability.schema";

type GetHostsForAvailabilityInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetHostsForAvailabilityInputSchema;
};

export type AvailabilityHost = {
  userId: number;
  isFixed: boolean;
  priority: number;
  weight: number;
  scheduleId: number | null;
  groupId: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type GetHostsForAvailabilityResponse = {
  hosts: AvailabilityHost[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export const getHostsForAvailabilityHandler = async ({
  ctx,
  input,
}: GetHostsForAvailabilityInput): Promise<GetHostsForAvailabilityResponse> => {
  const { eventTypeId, cursor, limit, search } = input;

  const hostRepository = new HostRepository(ctx.prisma);
  const { items, nextCursor, hasMore } = await hostRepository.findHostsForAvailabilityPaginated({
    eventTypeId,
    cursor: cursor ?? undefined,
    limit,
    search,
  });

  const hosts: AvailabilityHost[] = items.map((item) => ({
    userId: item.userId,
    isFixed: item.isFixed,
    priority: item.priority ?? 0,
    weight: item.weight ?? 100,
    scheduleId: item.scheduleId,
    groupId: item.groupId,
    name: item.user.name,
    avatarUrl: item.user.avatarUrl,
  }));

  return { hosts, nextCursor, hasMore };
};
