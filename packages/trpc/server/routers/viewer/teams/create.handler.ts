import { closeComUpsertTeamUser } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { user } = ctx;
  const { slug, name, logo } = input;
  const isOrgChildTeam = !!user.organizationId;

  // For orgs we want to create teams under the org
  if (user.organizationId && !user.organization.isOrgAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "org_admins_can_create_new_teams" });
  }

  const currentOrgId = ctx.user.organization?.id;

  const slugCollisions = await prisma.team.findFirst({
    where: {
      slug: slug,
      // If this is under an org, check that the team doesn't already exist
      ...(isOrgChildTeam && { parentId: user.organizationId }),
      parentId: currentOrgId
        ? {
            equals: currentOrgId,
          }
        : null,
    },
  });

  if (slugCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "team_url_taken" });

  // Ensure that the user is not duplicating a requested team
  const duplicatedRequest = await prisma.team.findFirst({
    where: {
      members: {
        some: {
          userId: ctx.user.id,
        },
      },
      metadata: {
        path: ["requestedSlug"],
        equals: slug,
      },
    },
  });

  if (duplicatedRequest) {
    return duplicatedRequest;
  }

  const createTeam = await prisma.team.create({
    data: {
      name,
      logo,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      metadata: {
        requestedSlug: slug,
      },
      ...(isOrgChildTeam && { parentId: user.organizationId }),
    },
  });

  // Sync Services: Close.com
  closeComUpsertTeamUser(createTeam, ctx.user, MembershipRole.OWNER);

  return createTeam;
};
