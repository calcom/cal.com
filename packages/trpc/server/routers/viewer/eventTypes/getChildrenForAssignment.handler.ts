import {
  EventTypeHostService,
  type PaginatedAssignmentChildrenResponse,
} from "@calcom/features/host/services/EventTypeHostService";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TGetChildrenForAssignmentInputSchema } from "./getChildrenForAssignment.schema";

type GetChildrenForAssignmentInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetChildrenForAssignmentInputSchema;
};

export type { PaginatedAssignmentChildrenResponse as GetChildrenForAssignmentResponse };
export type { AssignmentChild } from "@calcom/features/host/services/EventTypeHostService";

export const getChildrenForAssignmentHandler = async ({
  ctx,
  input,
}: GetChildrenForAssignmentInput): Promise<PaginatedAssignmentChildrenResponse> => {
  const service = new EventTypeHostService(ctx.prisma);
  return service.getChildrenForAssignment({
    eventTypeId: input.eventTypeId,
    cursor: input.cursor ?? undefined,
    limit: input.limit,
    search: input.search,
  });
};
