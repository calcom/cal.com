import type { NextApiRequest } from "next";

import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import { purchaseTeamOrOrgSubscription } from "@calcom/features/ee/teams/lib/payments";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getTrackingFromCookies } from "@calcom/lib/tracking";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type PublishOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    req?: NextApiRequest;
  };
};

export const publishHandler = async ({ ctx }: PublishOptions) => {
  const orgId = ctx.user.organizationId;
  if (!orgId)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You do not have an organization to upgrade" });

  // Check if user has permission to publish the organization
  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: orgId,
    permission: "organization.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to publish this organization",
    });
  }

  const prevTeam = await prisma.team.findUnique({
    where: {
      id: orgId,
    },
    include: { members: true },
  });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });

  const metadata = teamMetadataStrictSchema.safeParse(prevTeam.metadata);
  if (!metadata.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid team metadata" });

  // Since this is an ORG we need to make sure ORG members are scyned with the team. Every time a user is added to the TEAM, we need to add them to the ORG
  if (IS_TEAM_BILLING_ENABLED) {
    const tracking = getTrackingFromCookies(ctx.req?.cookies);

    const checkoutSession = await purchaseTeamOrOrgSubscription({
      teamId: prevTeam.id,
      seatsUsed: prevTeam.members.length,
      seatsToChargeFor: metadata.data?.orgSeats
        ? Math.max(prevTeam.members.length, metadata.data?.orgSeats ?? 0)
        : null,
      userId: ctx.user.id,
      isOrg: true,
      pricePerSeat: metadata.data?.orgPricePerSeat ?? null,
      billingPeriod: metadata.data?.billingPeriod ?? undefined,
      tracking,
    });

    if (!checkoutSession.url)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed retrieving a checkout session URL.",
      });
    return { url: checkoutSession.url, message: "Payment required to publish organization" };
  }

  if (!metadata.data?.requestedSlug) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Can't publish organization without `requestedSlug`",
    });
  }

  const { requestedSlug, ...newMetadata } = metadata.data;

  try {
    await prisma.team.update({
      where: { id: orgId },
      data: {
        slug: requestedSlug,
        metadata: { ...newMetadata },
      },
    });
  } catch (error) {
    const { message } = getRequestedSlugError(error, requestedSlug);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
  }

  return {
    url: `${WEBAPP_URL}/settings/organization/profile`,
    message: "Team published successfully",
  };
};

export default publishHandler;
