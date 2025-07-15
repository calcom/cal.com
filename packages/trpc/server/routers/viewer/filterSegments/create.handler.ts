import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment.repository";
import type { TCreateFilterSegmentInputSchema } from "@calcom/lib/server/repository/filterSegment.type.repository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const createFilterSegmentHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateFilterSegmentInputSchema;
}) => {
  const repository = new FilterSegmentRepository();
  return await repository.create({
    userId: ctx.user.id,
    input,
  });
};
