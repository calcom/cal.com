import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type DeleteCacheOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: {
    credentialId: number;
  };
};

export const deleteCacheHandler = async ({ ctx, input }: DeleteCacheOptions) => {
  const { user } = ctx;
  const { credentialId } = input;

  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      userId: user.id,
    },
  });

  if (!credential) {
    throw new Error("Credential not found or access denied");
  }

  await prisma.calendarCache.deleteMany({
    where: { credentialId },
  });

  return { success: true };
};
