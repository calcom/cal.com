import {
  EventTypeHostService,
  type PaginatedAvailabilityHostsResponse,
} from "@calcom/features/host/services/EventTypeHostService";
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

export type { PaginatedAvailabilityHostsResponse as GetHostsForAvailabilityResponse };
export type { AvailabilityHost } from "@calcom/features/host/services/EventTypeHostService";

export const getHostsForAvailabilityHandler = async ({
  ctx,
  input,
}: GetHostsForAvailabilityInput): Promise<PaginatedAvailabilityHostsResponse> => {
  const service = new EventTypeHostService(ctx.prisma);
  return service.getHostsForAvailability({
    eventTypeId: input.eventTypeId,
    cursor: input.cursor ?? undefined,
    limit: input.limit,
    search: input.search,
  });
};
