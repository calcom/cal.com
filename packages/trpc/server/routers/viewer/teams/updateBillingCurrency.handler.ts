import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TUpdateBillingCurrencyInputSchema } from "./updateBillingCurrency.schema";

type UpdateBillingCurrencyOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateBillingCurrencyInputSchema;
};

export const updateBillingCurrencyHandler = async ({ ctx, input }: UpdateBillingCurrencyOptions) => {
  const { teamId, billingCurrency } = input;

  if (!ctx.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, metadata: true },
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: ctx.user.id,
    teamId,
    permission: "team.manageBilling",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You do not have permission to update billing settings.",
    });
  }

  const currentMetadata = teamMetadataSchema.parse(team.metadata) || {};

  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: {
      metadata: {
        ...currentMetadata,
        billingCurrency,
      },
    },
    select: {
      id: true,
      metadata: true,
    },
  });

  const updatedMetadata = teamMetadataSchema.parse(updatedTeam.metadata);

  return {
    teamId: updatedTeam.id,
    billingCurrency: updatedMetadata?.billingCurrency,
  };
};

export default updateBillingCurrencyHandler;
