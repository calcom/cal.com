import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment";
import type { TDeleteFilterSegmentInputSchema } from "@calcom/lib/server/repository/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const deleteHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteFilterSegmentInputSchema;
}) => {
  const { id } = input;
  const userId = ctx.user.id;

  await FilterSegmentRepository.delete({
    userId,
    id,
  });

  return {
    id,
    message: "Filter segment deleted successfully",
  };
};
