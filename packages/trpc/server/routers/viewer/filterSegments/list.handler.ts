import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment";
import type { TListFilterSegmentsInputSchema } from "@calcom/lib/server/repository/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const listHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListFilterSegmentsInputSchema;
}) => {
  return await FilterSegmentRepository.get({
    userId: ctx.user.id,
    tableIdentifier: input.tableIdentifier,
  });
};
