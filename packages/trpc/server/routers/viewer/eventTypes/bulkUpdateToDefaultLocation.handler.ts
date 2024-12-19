import { bulkUpdateEventsToDefaultLocation } from "@calcom/lib/bulkUpdateEventsToDefaultLocation";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TBulkUpdateToDefaultLocationInputSchema } from "./bulkUpdateToDefaultLocation.schema";

type BulkUpdateToDefaultLocationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkUpdateToDefaultLocationInputSchema;
};

export const bulkUpdateToDefaultLocationHandler = ({ ctx, input }: BulkUpdateToDefaultLocationOptions) => {
  const { eventTypeIds } = input;
  return bulkUpdateEventsToDefaultLocation({
    eventTypeIds,
    user: ctx.user,
    prisma,
  });
};
