import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import { purchaseTeamSubscription } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TPublishInputSchema } from "./publish.schema";

type PublishOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TPublishInputSchema;
};

export const publishHandler = async ({ ctx, input }: PublishOptions) => {
  if (!(await isTeamAdmin(ctx.user.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  const { teamId: id } = input;

  const prevTeam = await prisma.team.findFirst({ where: { id }, include: { members: true } });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });

  const metadata = teamMetadataSchema.safeParse(prevTeam.metadata);

  if (!metadata.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid team metadata" });

  // if payment needed, respond with checkout url
  if (IS_TEAM_BILLING_ENABLED) {
    const checkoutSession = await purchaseTeamSubscription({
      teamId: prevTeam.id,
      seats: prevTeam.members.length,
      userId: ctx.user.id,
    });
    if (!checkoutSession.url)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed retrieving a checkout session URL.",
      });
    return { url: checkoutSession.url, message: "Payment required to publish team" };
  }

  if (!metadata.data?.requestedSlug) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Can't publish team without `requestedSlug`" });
  }

  const { requestedSlug, ...newMetadata } = metadata.data;
  let updatedTeam: Awaited<ReturnType<typeof prisma.team.update>>;

  try {
    updatedTeam = await prisma.team.update({
      where: { id },
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
    url: `${WEBAPP_URL}/settings/teams/${updatedTeam.id}/profile`,
    message: "Team published successfully",
  };
};
