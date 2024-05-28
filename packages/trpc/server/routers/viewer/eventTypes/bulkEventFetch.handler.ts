import getBulkEventTypes from "@calcom/lib/event-types/getBulkEventTYpes";

import type { TrpcSessionUser } from "../../../trpc";

type BulkEventFetchOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const bulkEventFetchHandler = async ({ ctx }: BulkEventFetchOptions) => {
  return getBulkEventTypes(ctx.user.id);
};
