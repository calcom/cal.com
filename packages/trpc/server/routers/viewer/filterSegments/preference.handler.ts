import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment";
import type { TSetFilterSegmentPreferenceInputSchema } from "@calcom/lib/server/repository/filterSegment.type";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

export const setPreferenceHandler = async ({
  ctx,
  input,
}: {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSetFilterSegmentPreferenceInputSchema;
}) => {
  const { tableIdentifier, segmentId } = input;
  const userId = ctx.user.id;

  return await FilterSegmentRepository.setPreference({
    userId,
    tableIdentifier,
    segmentId,
  });
};
