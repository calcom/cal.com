import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment.repository";
import type { TUpdateFilterSegmentInputSchema } from "@calcom/lib/server/repository/filterSegment.type.repository";
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
