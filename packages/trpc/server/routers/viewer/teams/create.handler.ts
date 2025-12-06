import type { NextApiRequest } from "next";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { generateTeamCheckoutSession } from "@calcom/features/ee/teams/lib/payments";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { TeamCreationService } from "@calcom/features/ee/teams/services/TeamCreationService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { uploadLogo } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { getTrackingFromCookies } from "@calcom/lib/tracking";
import type { TrackingData } from "@calcom/lib/tracking";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    req?: NextApiRequest;
  };
  input: TCreateInputSchema;
};

const generateCheckoutSession = async ({
  teamSlug,
  teamName,
  userId,
  isOnboarding,
  tracking,
}: {
  teamSlug: string;
  teamName: string;
  userId: number;
  isOnboarding?: boolean;
  tracking?: TrackingData;
}) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    console.info("Team billing is disabled, not generating a checkout session.");
    return;
  }

  const checkoutSession = await generateTeamCheckoutSession({
    teamSlug,
    teamName,
    userId,
    isOnboarding,
    tracking,
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
  const { slug, name, bio, isOnboarding } = input;
  const isOrgChildTeam = !!user.profile?.organizationId;

  // For orgs we want to create teams under the org
  if (user.profile?.organizationId && !user.organization.isOrgAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "org_admins_can_create_new_teams" });
  }

  const teamRepository = new TeamRepository(prisma);
  const creditService = new CreditService();
  const permissionCheckService = new PermissionCheckService();
  const userRepository = new UserRepository(prisma);
  const teamCreationService = new TeamCreationService(
    teamRepository,
    creditService,
    permissionCheckService,
    userRepository
  );

  const slugValidation = await teamCreationService.validateSingleTeamSlug({
    slug,
    parentId: isOrgChildTeam ? user.profile?.organizationId : null,
    organizationId: user.profile?.organizationId || null,
  });

  if (slugValidation.isTeamSlugTaken) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "team_url_taken" });
  }

  if (slugValidation.isUserSlugTaken) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "team_slug_exists_as_user" });
  }

  // If the user is not a part of an org, then make them pay before creating the team
  if (!isOrgChildTeam) {
    const tracking = getTrackingFromCookies(ctx.req?.cookies);

    const checkoutSession = await generateCheckoutSession({
      teamSlug: slug,
      teamName: name,
      userId: user.id,
      isOnboarding,
      tracking,
    });

    // If there is a checkout session, return it. Otherwise, it means it's disabled.
    if (checkoutSession)
      return {
        url: checkoutSession.url,
        message: checkoutSession.message,
        team: null,
      };
  }

  const createdTeam = await teamCreationService.createSingleTeam({
    slug,
    name,
    bio,
    parentId: isOrgChildTeam ? user.profile?.organizationId : null,
    ownerId: ctx.user.id,
  });

  // Upload logo, create doesn't allow logo removal
  if (
    input.logo &&
    (input.logo.startsWith("data:image/png;base64,") ||
      input.logo.startsWith("data:image/jpeg;base64,") ||
      input.logo.startsWith("data:image/jpg;base64,"))
  ) {
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

  return {
    url: `${WEBAPP_URL}/settings/teams/${createdTeam.id}/onboard-members`,
    message: "Team billing is disabled, not generating a checkout session.",
    team: createdTeam,
  };
};

export default createHandler;
