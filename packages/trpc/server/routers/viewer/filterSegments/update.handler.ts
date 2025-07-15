import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegmentRepository";
import type { TUpdateFilterSegmentInputSchema } from "@calcom/lib/server/repository/filterSegmentTypeRepository";
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
