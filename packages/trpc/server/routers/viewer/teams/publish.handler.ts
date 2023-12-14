import type { Prisma } from "@prisma/client";

import { getRequestedSlugError } from "@calcom/app-store/stripepayment/lib/team-billing";
import {
  purchaseTeamSubscription,
  updateQuantitySubscriptionFromStripe,
} from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { closeComUpdateTeam } from "@calcom/lib/sync/SyncServiceManager";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TPublishInputSchema } from "./publish.schema";

type PublishOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TPublishInputSchema;
};

const parseMetadataOrThrow = (metadata: Prisma.JsonValue) => {
  const parsedMetadata = teamMetadataSchema.safeParse(metadata);

  if (!parsedMetadata.success || !parsedMetadata.data)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid team metadata" });
  return parsedMetadata.data;
};

const generateCheckoutSession = async ({
  teamId,
  seats,
  userId,
}: {
  teamId: number;
  seats: number;
  userId: number;
}) => {
  if (!IS_TEAM_BILLING_ENABLED) return;

  const checkoutSession = await purchaseTeamSubscription({
    teamId,
    seats,
    userId,
  });
  if (!checkoutSession.url)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed retrieving a checkout session URL.",
    });
  return { url: checkoutSession.url, message: "Payment required to publish team" };
};

const publishOrganizationTeamHandler = async ({ ctx, input }: PublishOptions) => {
  if (!ctx.user.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (!isOrganisationAdmin(ctx.user.id, ctx.user?.organizationId))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const createdTeam = await prisma.team.findFirst({
    where: { id: input.teamId, parentId: ctx.user.organizationId },
    include: {
      parent: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!createdTeam || !createdTeam.parentId)
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });

  const metadata = parseMetadataOrThrow(createdTeam.metadata);

  // We update the quantity of the parent ID (organization) subscription
  if (IS_TEAM_BILLING_ENABLED) {
    await updateQuantitySubscriptionFromStripe(createdTeam.parentId);
  }

  if (!metadata?.requestedSlug) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Can't publish team without `requestedSlug`" });
  }
  const { requestedSlug, ...newMetadata } = metadata;
  let updatedTeam: Awaited<ReturnType<typeof prisma.team.update>>;

  try {
    updatedTeam = await prisma.team.update({
      where: { id: createdTeam.id },
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
    url: `${WEBAPP_URL}/settings/teams/${updatedTeam.id}/profile`,
    message: "Team published successfully",
  };
};

export const publishHandler = async ({ ctx, input }: PublishOptions) => {
  if (ctx.user.organizationId) return publishOrganizationTeamHandler({ ctx, input });

  if (!(await isTeamAdmin(ctx.user.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  const { teamId: id } = input;

  const prevTeam = await prisma.team.findFirst({ where: { id }, include: { members: true } });

  if (!prevTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });

  const metadata = parseMetadataOrThrow(prevTeam.metadata);

  // if payment needed, respond with checkout url
  const checkoutSession = await generateCheckoutSession({
    teamId: prevTeam.id,
    seats: prevTeam.members.length,
    userId: ctx.user.id,
  });

  if (checkoutSession) return checkoutSession;

  if (!metadata?.requestedSlug) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Can't publish team without `requestedSlug`" });
  }

  const { requestedSlug, ...newMetadata } = metadata;
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

export default publishHandler;
