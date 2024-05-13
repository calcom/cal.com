import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import { purchaseTeamOrOrgSubscription } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";

type PublishOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const publishHandler = async ({ ctx }: PublishOptions) => {
  const orgId = ctx.user.organizationId;
  if (!orgId)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You do not have an organization to upgrade" });

  if (!(await isOrganisationAdmin(ctx.user.id, orgId))) throw new TRPCError({ code: "UNAUTHORIZED" });

  const prevTeam = await prisma.team.findFirst({
    where: {
      id: orgId,
    },
    include: { members: true },
  });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });

  const metadata = teamMetadataSchema.safeParse(prevTeam.metadata);
  if (!metadata.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid team metadata" });

  // Since this is an ORG we need to make sure ORG members are scyned with the team. Every time a user is added to the TEAM, we need to add them to the ORG
  if (IS_TEAM_BILLING_ENABLED) {
    const checkoutSession = await purchaseTeamOrOrgSubscription({
      teamId: prevTeam.id,
      seatsUsed: prevTeam.members.length,
      seatsToChargeFor: metadata.data?.orgSeats
        ? Math.max(prevTeam.members.length, metadata.data?.orgSeats ?? 0)
        : null,
      userId: ctx.user.id,
      isOrg: true,
      pricePerSeat: metadata.data?.orgPricePerSeat ?? null,
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
  let updatedTeam: Awaited<ReturnType<typeof prisma.team.update>>;

  try {
    updatedTeam = await prisma.team.update({
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

  // Sync Services: Close.com
  closeComUpdateTeam(prevTeam, updatedTeam);

  return {
    url: `${WEBAPP_URL}/settings/organization/profile`,
    message: "Team published successfully",
  };
};

export default publishHandler;
