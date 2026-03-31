import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import { getTeamRepository } from "@calcom/features/di/containers/TeamRepository";
import { getBillingProviderService } from "@calcom/features/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TTransferOwnershipInput } from "./transferOwnership.schema";

const log: ReturnType<typeof logger.getSubLogger> = logger.getSubLogger({
  prefix: ["admin:transferOwnership"],
});

type TransferOwnershipOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TTransferOwnershipInput;
};

async function validateAndFetchMembers(teamId: number, newOwnerUserId: number, previousOwnerUserId: number) {
  const membershipRepository = getMembershipRepository();

  const [newOwnerMembership, previousOwnerMembership] = await Promise.all([
    membershipRepository.findByUserIdAndTeamIdIncludeUser({ userId: newOwnerUserId, teamId }),
    membershipRepository.findByUserIdAndTeamIdIncludeUser({ userId: previousOwnerUserId, teamId }),
  ]);

  if (!newOwnerMembership) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User is not a member of this team" });
  }

  if (newOwnerMembership.role === MembershipRole.OWNER) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User is already an owner" });
  }

  if (!previousOwnerMembership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Previous owner membership not found" });
  }

  if (previousOwnerMembership.role !== MembershipRole.OWNER) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Previous owner does not have OWNER role" });
  }

  return { newOwnerMembership, previousOwnerMembership };
}

async function getStripeCustomerEmail(customerId: string): Promise<string> {
  const billingProvider = getBillingProviderService();
  const customer = await billingProvider.getCustomer(customerId);

  if (!customer || "deleted" in customer) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Stripe customer ${customerId} not found or deleted` });
  }

  return customer.email ?? "";
}

export const transferOwnershipHandler = async ({ ctx, input }: TransferOwnershipOptions) => {
  const { teamId, newOwnerUserId, previousOwnerUserId, previousOwnerAction, customerId, mode } = input;
  const adminUserId = ctx.user.id;

  const { newOwnerMembership, previousOwnerMembership } = await validateAndFetchMembers(
    teamId,
    newOwnerUserId,
    previousOwnerUserId
  );

  const currentStripeEmail = await getStripeCustomerEmail(customerId);
  const newOwnerEmail = newOwnerMembership.user.email;

  const teamRepository = getTeamRepository();
  const team = await teamRepository.findById({ id: teamId });

  if (mode === "preview") {
    log.info("Ownership transfer previewed", {
      adminUserId,
      teamId,
      teamName: team?.name,
      newOwnerUserId,
      previousOwnerUserId,
      previousOwnerAction,
    });

    return {
      mode: "preview" as const,
      newOwner: {
        userId: newOwnerMembership.user.id,
        email: newOwnerMembership.user.email,
        name: newOwnerMembership.user.name,
      },
      previousOwner: {
        userId: previousOwnerMembership.user.id,
        email: previousOwnerMembership.user.email,
        name: previousOwnerMembership.user.name,
        action: previousOwnerAction,
      },
      stripeEmailChange: {
        from: currentStripeEmail,
        to: newOwnerEmail,
      },
    };
  }

  try {
    const billingProvider = getBillingProviderService();
    await billingProvider.updateCustomer({ customerId, email: newOwnerEmail });
  } catch (error) {
    log.error("Failed to update Stripe billing email", {
      adminUserId,
      teamId,
      customerId,
      newOwnerEmail,
      error,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update Stripe billing email. Ownership transfer aborted.",
    });
  }

  const membershipRepository = getMembershipRepository();
  await membershipRepository.transferOwnership({
    teamId,
    newOwnerUserId,
    previousOwnerUserId,
    previousOwnerAction,
  });

  log.info("Ownership transfer executed", {
    adminUserId,
    teamId,
    teamName: team?.name,
    newOwner: { userId: newOwnerUserId, email: newOwnerEmail },
    previousOwner: {
      userId: previousOwnerUserId,
      email: previousOwnerMembership.user.email,
      action: previousOwnerAction,
    },
    stripeEmailUpdated: true,
  });

  return { mode: "execute" as const, success: true };
};

export default transferOwnershipHandler;
