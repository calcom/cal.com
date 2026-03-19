import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import { TeamDunningRepository } from "@calcom/features/ee/billing/repository/dunning/TeamDunningRepository";
import { OrgDunningRepository } from "@calcom/features/ee/billing/repository/dunning/OrgDunningRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRecreateOwnershipInput } from "./recreateOwnership.schema";

const log = logger.getSubLogger({ prefix: ["admin:recreateOwnership"] });

type RecreateOwnershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRecreateOwnershipInput;
};

export const recreateOwnershipHandler = async ({ ctx, input }: RecreateOwnershipOptions) => {
  const { teamId, newOwnerUserId, billingId, entityType, mode } = input;
  const adminUserId = ctx.user.id;

  const membershipRepository = getMembershipRepository();

  const newOwnerMembership = await membershipRepository.findByUserIdAndTeamIdIncludeUser({
    userId: newOwnerUserId,
    teamId,
  });

  if (!newOwnerMembership) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User is not a member of this team" });
  }

  if (newOwnerMembership.role === MembershipRole.OWNER) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User is already an owner" });
  }

  const teamRepository = new TeamRepository(prisma);
  const team = await teamRepository.findById({ id: teamId });

  if (mode === "preview") {
    log.info("Ownership recreation previewed", {
      adminUserId,
      teamId,
      teamName: team?.name,
      newOwnerUserId,
    });

    return {
      mode: "preview" as const,
      newOwner: {
        userId: newOwnerMembership.user.id,
        email: newOwnerMembership.user.email,
        name: newOwnerMembership.user.name,
      },
      dunningAction: "CANCELLED" as const,
    };
  }

  await membershipRepository.updateRole({
    userId: newOwnerUserId,
    teamId,
    role: MembershipRole.OWNER,
  });

  const dunningRepository =
    entityType === "organization" ? new OrgDunningRepository() : new TeamDunningRepository();

  const now = new Date();
  await dunningRepository.upsert(billingId, {
    status: "CANCELLED",
    firstFailedAt: now,
    lastFailedAt: now,
    resolvedAt: null,
    subscriptionId: null,
    failedInvoiceId: null,
    invoiceUrl: null,
    failureReason: "Owner account deleted — subscription lost. Recreated via admin tool.",
  });

  log.info("Ownership recreated", {
    adminUserId,
    teamId,
    teamName: team?.name,
    newOwner: { userId: newOwnerUserId, email: newOwnerMembership.user.email },
    dunningSetToCancelled: true,
  });

  return { mode: "execute" as const, success: true };
};

export default recreateOwnershipHandler;
