import { getBulkUserEventTypes } from "@calcom/lib/event-types/getBulkEventTypes";

import type { TrpcSessionUser } from "../../../trpc";

type BulkEventFetchOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const bulkEventFetchHandler = async ({ ctx }: BulkEventFetchOptions) => {
  return getBulkUserEventTypes(ctx.user.id);
};
