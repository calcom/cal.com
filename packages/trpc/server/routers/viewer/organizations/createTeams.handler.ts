import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateTeamsSchema } from "./createTeams.schema";

type CreateTeamsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateTeamsSchema;
};

export const createTeamsHandler = async ({ ctx, input }: CreateTeamsOptions) => {
  const { teamNames, orgId } = input;

  const organization = await prisma.team.findFirst({ where: { id: orgId }, select: { metadata: true } });
  const metadata = teamMetadataSchema.parse(organization?.metadata);

  if (!metadata?.requestedSlug) throw new TRPCError({ code: "BAD_REQUEST", message: "no_organization" });

  const userMembership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: orgId,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  // TODO test this check works
  if (!userMembership || userMembership.role !== MembershipRole.OWNER)
    throw new TRPCError({ code: "BAD_REQUEST", message: "not_authorized" });

  const [teamSlugs, userSlugs] = await prisma.$transaction([
    prisma.team.findMany({ where: { parentId: orgId }, select: { slug: true } }),
    prisma.user.findMany({ where: { organizationId: orgId }, select: { username: true } }),
  ]);

  const existingSlugs = teamSlugs
    .flatMap((ts) => ts.slug ?? [])
    .concat(userSlugs.flatMap((us) => us.username ?? []));

  const duplicatedSlugs = existingSlugs.filter((slug) => teamNames.includes(slug));

  await prisma.team.createMany({
    data: teamNames.flatMap((name) => {
      if (!duplicatedSlugs.includes(name)) {
        return { name, parentId: orgId, slug: slugify(name) };
      } else {
        return [];
      }
    }),
  });

  return { duplicatedSlugs };
};
