import { FilterSegmentRepository } from "@calcom/features/data-table/repositories/filterSegment";
import type { TListFilterSegmentsInputSchema } from "@calcom/features/data-table/repositories/filterSegment.type";
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
  const repository = new FilterSegmentRepository();
  return await repository.get({
    userId: ctx.user.id,
    tableIdentifier: input.tableIdentifier,
  });
};
