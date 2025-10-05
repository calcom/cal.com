import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TUpdateMembershipBookingLimitsInputSchema } from "./updateMembershipBookingLimits.schema";

type UpdateMembershipBookingLimitsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateMembershipBookingLimitsInputSchema;
};

export const updateMembershipBookingLimitsHandler = async ({
  ctx,
  input,
}: UpdateMembershipBookingLimitsOptions) => {
  const { user } = ctx;
  const { organizationId } = user;

  if (!organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be a member of an organization" });
  }

  // Check if the user is an admin or owner of the organization
  // We need to check the user's role in the organization context
  const userMembership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      teamId: organizationId,
      accepted: true,
    },
  });

  if (!userMembership || !checkAdminOrOwner(userMembership.role)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Only organization admins/owners can update member booking limits",
    });
  }

  // Verify the membership exists
  const membership = await prisma.membership.findFirst({
    where: {
      userId: input.userId,
      teamId: input.teamId,
      accepted: true,
    },
  });

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });
  }

  // Update the membership with new booking limits
  await prisma.membership.update({
    where: {
      id: membership.id,
    },
    data: {
      bookingLimits: input.bookingLimits ?? undefined,
    },
  });

  return {
    success: true,
  };
};

export default updateMembershipBookingLimitsHandler;
