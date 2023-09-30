import { parseProfileData, profileSelect } from "@calcom/features/ee/profiles/lib/profileUtils";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type ListHandlerInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListHandlerInput) => {
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      ...profileSelect(),
    },
  });
  const result = parseProfileData(user, ctx.user);
  return result;
};

export default listHandler;
