import { EventTypeHostService } from "@calcom/features/host/services/EventTypeHostService";
import type { AllAssignmentChildrenResponse } from "@calcom/features/host/services/IEventTypeHostService";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TGetAllChildrenForAssignmentInputSchema } from "./getAllChildrenForAssignment.schema";

type GetAllChildrenForAssignmentInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetAllChildrenForAssignmentInputSchema;
};

export type { AllAssignmentChildrenResponse as GetAllChildrenForAssignmentResponse };

export const getAllChildrenForAssignmentHandler = async ({
  ctx,
  input,
}: GetAllChildrenForAssignmentInput): Promise<AllAssignmentChildrenResponse> => {
  const service = new EventTypeHostService(ctx.prisma);
  return service.getAllChildrenForAssignment({ eventTypeId: input.eventTypeId });
};
