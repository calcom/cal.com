import { FilterSegmentRepository } from "@calcom/lib/server/repository/filterSegment";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TSetFilterSegmentPreferenceInputSchema } from "./preference.schema";

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
