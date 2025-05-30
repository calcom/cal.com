import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment";
import type { TUpdateFilterSegmentInputSchema } from "@calcom/lib/server/repository/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const updateHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateFilterSegmentInputSchema;
}) => {
  const userId = ctx.user.id;
  return await FilterSegmentRepository.update({
    userId,
    input,
  });
};
