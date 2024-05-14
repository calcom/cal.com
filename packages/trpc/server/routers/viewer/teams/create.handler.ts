import { generateTeamCheckoutSession } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { uploadLogo } from "@calcom/lib/server/uploadLogo";
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
  teamSlug: string;
  teamName: string;
  userId: number;
}) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    console.info("Team billing is disabled, not generating a checkout session.");
    return;
  }

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
  const { slug, name } = input;
  const isOrgChildTeam = !!user.profile?.organizationId;

  // For orgs we want to create teams under the org
  if (user.profile?.organizationId && !user.organization.isOrgAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "org_admins_can_create_new_teams" });
  }

  const slugCollisions = await prisma.team.findFirst({
    where: {
      slug: slug,
      // If this is under an org, check that the team doesn't already exist
      parentId: isOrgChildTeam ? user.profile?.organizationId : null,
    },
  });

  if (slugCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "team_url_taken" });

  if (user.profile?.organizationId) {
    const nameCollisions = await isSlugTakenBySomeUserInTheOrganization({
      organizationId: user.profile?.organizationId,
      slug: slug,
    });

    if (nameCollisions) throw new TRPCError({ code: "BAD_REQUEST", message: "team_slug_exists_as_user" });
  }

  // If the user is not a part of an org, then make them pay before creating the team
  if (!isOrgChildTeam) {
    const checkoutSession = await generateCheckoutSession({
      teamSlug: slug,
      teamName: name,
      userId: user.id,
    });

    // If there is a checkout session, return it. Otherwise, it means it's disabled.
    if (checkoutSession)
      return {
        url: checkoutSession.url,
        message: checkoutSession.message,
        team: null,
      };
  }

  const createdTeam = await prisma.team.create({
    data: {
      slug,
      name,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      ...(isOrgChildTeam && { parentId: user.profile?.organizationId }),
    },
  });
  // Upload logo, create doesn't allow logo removal
  if (input.logo && input.logo.startsWith("data:image/png;base64,")) {
    const logoUrl = await uploadLogo({
      logo: await resizeBase64Image(input.logo),
      teamId: createdTeam.id,
    });
    await prisma.team.update({
      where: {
        id: createdTeam.id,
      },
      data: {
        logoUrl,
      },
    });
  }
  // Sync Services: Close.com
  closeComUpsertTeamUser(createdTeam, ctx.user, MembershipRole.OWNER);

  return {
    url: `${WEBAPP_URL}/settings/teams/${createdTeam.id}/onboard-members`,
    message: "Team billing is disabled, not generating a checkout session.",
    team: createdTeam,
  };
};

async function isSlugTakenBySomeUserInTheOrganization({
  organizationId,
  slug,
}: {
  organizationId: number;
  slug: string;
}) {
  return await ProfileRepository.findByOrgIdAndUsername({
    organizationId: organizationId,
    username: slug,
  });
}

export default createHandler;
