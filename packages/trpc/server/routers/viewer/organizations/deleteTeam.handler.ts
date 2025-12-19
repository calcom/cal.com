import logger from "@calcom/lib/logger";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteTeamInputSchema } from "./deleteTeam.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteTeamInputSchema;
};

export const deleteTeamHandler = async ({ ctx, input }: DeleteOptions) => {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: {
      id: true,
      parentId: true,
      metadata: true,
    },
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  if (!team.parentId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Can only delete teams within organizations" });
  }

  // Check if user has permission to delete teams in this organization
  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId: team.parentId,
    permission: "team.delete",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to delete teams in this organization",
    });
  }
   
 // Safe Stripe Cancellation Fix
  const metadata = team.metadata as { subscriptionId?: string } | null;
  if (metadata?.subscriptionId) {
    try {
      await stripe.subscriptions.cancel(metadata.subscriptionId);
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to cancel Stripe subscription during team disband", { message: error.message });
      }
    }
  }
 
  await prisma.membership.deleteMany({
    where: {
      teamId: input.teamId,
    },
  });

  await prisma.team.delete({
    where: {
      id: input.teamId,
    },
  });
};

export default deleteTeamHandler;
