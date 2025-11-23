import { FilterSegmentRepository } from "@calcom/features/data-table/repositories/filterSegment";
import type { TUpdateFilterSegmentInputSchema } from "@calcom/features/data-table/repositories/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const updateFilterSegmentHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateFilterSegmentInputSchema;
}) => {
  const repository = new FilterSegmentRepository();
  return await repository.update({
    userId: ctx.user.id,
    input,
  });
};
