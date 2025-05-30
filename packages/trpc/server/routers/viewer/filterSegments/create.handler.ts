import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment";
import type { TCreateFilterSegmentInputSchema } from "@calcom/lib/server/repository/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const createHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateFilterSegmentInputSchema;
}) => {
  return await FilterSegmentRepository.create({
    userId: ctx.user.id,
    input,
  });
};
