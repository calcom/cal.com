import type { TListFilterSegmentsInputSchema } from "@calcom/lib/server/repository/filterSegment.type";
import { FilterSegmentRepository } from "@calcom/lib/server/repository/prismaFilterSegment";
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
