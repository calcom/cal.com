import { EventTypeHostService } from "@calcom/features/host/services/EventTypeHostService";
import type { AllHostsResponse } from "@calcom/features/host/services/IEventTypeHostService";
import type { PrismaClient } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "../../../types";
import type { TGetAllHostsForAvailabilityInputSchema } from "./getAllHostsForAvailability.schema";

type GetAllHostsInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetAllHostsForAvailabilityInputSchema;
};

export type { AllHostsResponse as GetAllHostsResponse };

export const getAllHostsHandler = async ({ ctx, input }: GetAllHostsInput): Promise<AllHostsResponse> => {
  const service = new EventTypeHostService(ctx.prisma);
  return service.getAllHosts({ eventTypeId: input.eventTypeId });
};
