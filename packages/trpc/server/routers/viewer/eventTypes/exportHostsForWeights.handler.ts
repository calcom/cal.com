import { EventTypeHostService } from "@calcom/features/host/services/EventTypeHostService";
import type { ExportWeightsResponse } from "@calcom/features/host/services/IEventTypeHostService";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TExportHostsForWeightsInputSchema } from "./exportHostsForWeights.schema";

type ExportHostsForWeightsInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TExportHostsForWeightsInputSchema;
};

export type { ExportWeightsResponse as ExportHostsForWeightsResponse };
export type { ExportedWeightMember } from "@calcom/features/host/services/IEventTypeHostService";

export const exportHostsForWeightsHandler = async ({
  ctx,
  input,
}: ExportHostsForWeightsInput): Promise<ExportWeightsResponse> => {
  const service = new EventTypeHostService(ctx.prisma);
  return service.exportHostsForWeights({
    eventTypeId: input.eventTypeId,
    assignAllTeamMembers: input.assignAllTeamMembers,
    assignRRMembersUsingSegment: input.assignRRMembersUsingSegment,
    attributesQueryValue: input.attributesQueryValue,
    organizationId: ctx.user.organizationId,
  });
};
