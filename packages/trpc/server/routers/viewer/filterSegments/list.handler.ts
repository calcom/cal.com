import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment.repository";
import type { TListFilterSegmentsInputSchema } from "@calcom/lib/server/repository/filterSegment.type.repository";
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
