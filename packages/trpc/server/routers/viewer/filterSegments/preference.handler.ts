import { FilterSegmentRepository } from "@calcom/features/data-table/repositories/filterSegment";
import type { TSetFilterSegmentPreferenceInputSchema } from "@calcom/features/data-table/repositories/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const setFilterSegmentPreferenceHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetFilterSegmentPreferenceInputSchema;
}) => {
  const repository = new FilterSegmentRepository();
  return await repository.setPreference({
    userId: ctx.user.id,
    tableIdentifier: input.tableIdentifier,
    segmentId: input.segmentId,
  });
};
