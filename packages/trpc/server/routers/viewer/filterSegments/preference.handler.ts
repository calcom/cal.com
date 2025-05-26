import { prisma } from "@calcom/prisma";
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

  if (segmentId === null) {
    await prisma.userFilterSegmentPreference.deleteMany({
      where: {
        userId,
        tableIdentifier,
      },
    });
    return null;
  }

  const preference = await prisma.userFilterSegmentPreference.upsert({
    where: {
      userId_tableIdentifier: {
        userId,
        tableIdentifier,
      },
    },
    update: {
      segmentId,
    },
    create: {
      userId,
      tableIdentifier,
      segmentId,
    },
  });

  return preference;
};
