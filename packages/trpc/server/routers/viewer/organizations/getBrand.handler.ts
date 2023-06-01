import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetBrandSchema } from "./getBrand.schema";

type VerifyCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetBrandSchema;
};

export const getBrandHandler = async ({ ctx, input }: VerifyCodeOptions) => {
  const { orgId } = input;
  const { user } = ctx;

  if (!orgId) return null;
  if (user.organizationId !== orgId) return null;

  return await prisma.team.findFirst({
    where: {
      id: orgId,
    },
    select: {
      logo: true,
      name: true,
      slug: true,
    },
  });
};
