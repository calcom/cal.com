import { generateTeamCheckoutSession } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
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

const generateCheckoutSession = async ({
  teamSlug,
  teamName,
  userId,
}: {
  teamId: number;
  seats: number;
  userId: number;
}) => {
  if (!IS_TEAM_BILLING_ENABLED) return;

  const checkoutSession = await generateTeamCheckoutSession({
    teamSlug,
    teamName,
    userId,
  });

  if (!checkoutSession.url)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed retrieving a checkout session URL.",
    });
  return { url: checkoutSession.url, message: "Payment required to publish team" };
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { user } = ctx;
  const { slug, name, logo } = input;
  const isOrgChildTeam = !!user.organizationId;

  // For orgs we want to create teams under the org
  if (user.organizationId && !user.organization.isOrgAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "org_admins_can_create_new_teams" });
  }

  const slugCollisions = await prisma.team.findFirst({
    where: {
      slug: slug,
      // If this is under an org, check that the team doesn't already exist
      parentId: isOrgChildTeam ? user.organizationId : null,
    },
  });

  if (slugCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "team_url_taken" });

  if (user.organizationId) {
    const nameCollisions = await prisma.user.findFirst({
      where: {
        organizationId: user.organization.id,
        username: slug,
      },
    });

    if (nameCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "team_slug_exists_as_user" });
  }

  const checkoutSession = await generateCheckoutSession({
    teamSlug: slug,
    teamName: name,
    userId: user.id,
  });

  return checkoutSession;

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
      ...(isOrgChildTeam ? { slug } : {}),
      name,
      logo,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      metadata: !isOrgChildTeam
        ? {
            requestedSlug: slug,
          }
        : undefined,
      ...(isOrgChildTeam && { parentId: user.organizationId }),
    },
  });

  // Sync Services: Close.com
  closeComUpsertTeamUser(createTeam, ctx.user, MembershipRole.OWNER);

  return createTeam;
};
