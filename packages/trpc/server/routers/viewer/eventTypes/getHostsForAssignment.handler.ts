import {
  EventTypeHostService,
  type PaginatedAssignmentHostsResponse,
} from "@calcom/features/host/services/EventTypeHostService";
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

export type { PaginatedAssignmentHostsResponse as GetHostsForAssignmentResponse };
export type { AssignmentHost } from "@calcom/features/host/services/EventTypeHostService";

export const getHostsForAssignmentHandler = async ({
  ctx,
  input,
}: GetHostsForAssignmentInput): Promise<PaginatedAssignmentHostsResponse> => {
  const service = new EventTypeHostService(ctx.prisma);
  return service.getHostsForAssignment({
    eventTypeId: input.eventTypeId,
    cursor: input.cursor ?? undefined,
    limit: input.limit,
    search: input.search,
    memberUserIds: input.memberUserIds,
  });
};
