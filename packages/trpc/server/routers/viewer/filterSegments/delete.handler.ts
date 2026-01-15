import { FilterSegmentRepository } from "@calcom/features/data-table/repositories/filterSegment";
import type { TDeleteFilterSegmentInputSchema } from "@calcom/features/data-table/repositories/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const deleteFilterSegmentHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteFilterSegmentInputSchema;
}) => {
  const repository = new FilterSegmentRepository();
  await repository.delete({
    userId: ctx.user.id,
    id: input.id,
  });

  return {
    id: input.id,
    message: "Filter segment deleted successfully",
  };
};
