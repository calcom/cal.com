import getBulkEventTypes from "@calcom/features/eventtypes/lib/getBulkEventTypes";

import type { TrpcSessionUser } from "../../../trpc";

type BulkEventFetchOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const bulkEventFetchHandler = async ({ ctx }: BulkEventFetchOptions) => {
  return getBulkEventTypes(ctx.user.id);
};
