import { getBulkUserEventTypes } from "@calcom/app-store/src/_utils/getBulkEventTypes";

import type { TrpcSessionUser } from "../../../types";

type BulkEventFetchOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const bulkEventFetchHandler = async ({ ctx }: BulkEventFetchOptions) => {
  return getBulkUserEventTypes(ctx.user.id);
};
