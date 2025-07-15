import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegmentRepository";
import type { TSetFilterSegmentPreferenceInputSchema } from "@calcom/lib/server/repository/filterSegmentTypeRepository";
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
