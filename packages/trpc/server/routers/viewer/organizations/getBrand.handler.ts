import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type VerifyCodeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getBrandHandler = async ({ ctx }: VerifyCodeOptions) => {
  const { user } = ctx;

  if (!user.organizationId) return null;

  const team = await prisma.team.findFirst({
    where: {
      id: user.organizationId,
    },
    select: {
      logo: true,
      name: true,
      slug: true,
      metadata: true,
    },
  });

  const metadata = teamMetadataSchema.parse(team?.metadata);
  const slug = team?.slug || metadata?.requestedSlug;

  return {
    ...team,
    metadata,
    slug,
  };
};
