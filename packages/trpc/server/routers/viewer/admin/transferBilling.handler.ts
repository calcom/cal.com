import {
  getAdminBillingRepository,
  getBillingProviderService,
} from "@calcom/features/ee/billing/di/containers/Billing";
import logger from "@calcom/lib/logger";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TTransferBillingInput } from "./transferBilling.schema";

const log = logger.getSubLogger({ prefix: ["admin:transferBilling"] });

type TransferBillingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TTransferBillingInput;
};

async function fetchNewSubscriptionItemId(subscriptionId: string): Promise<string> {
  const billingProvider = getBillingProviderService();
  const subscription = await billingProvider.getSubscription(subscriptionId);

  if (!subscription || subscription.items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Subscription ${subscriptionId} not found in Stripe or has no items`,
    });
  }

  return subscription.items[0].id;
}

function getAffectedRecords(
  entityType: "team" | "organization",
  teamMetadata: Record<string, unknown> | null
): string[] {
  const records = [entityType === "team" ? "TeamBilling" : "OrganizationBilling"];

  if (teamMetadata && "subscriptionId" in teamMetadata) {
    records.push("Team metadata");
  }

  return records;
}

export const transferBillingHandler = async ({ ctx, input }: TransferBillingOptions) => {
  const { billingId, entityType, newCustomerId, newSubscriptionId, mode } = input;
  const adminUserId = ctx.user.id;
  const repo = getAdminBillingRepository();

  const record =
    entityType === "team"
      ? await repo.findTeamBillingById(billingId)
      : await repo.findOrgBillingById(billingId);
  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Billing record ${billingId} not found` });
  }

  const newSubscriptionItemId = await fetchNewSubscriptionItemId(newSubscriptionId);

  const team = await repo.findTeamWithMetadata(record.teamId);
  const parsedMetadata = teamMetadataSchema.safeParse(team?.metadata);
  const metadata = parsedMetadata.success ? parsedMetadata.data : null;
  const affectedRecords = getAffectedRecords(entityType, metadata as Record<string, unknown> | null);

  if (mode === "preview") {
    log.info("Billing transfer previewed", {
      adminUserId,
      billingId,
      entityType,
      teamId: record.teamId,
      teamName: team?.name,
      from: { customerId: record.customerId, subscriptionId: record.subscriptionId },
      to: { customerId: newCustomerId, subscriptionId: newSubscriptionId },
    });

    return {
      mode: "preview" as const,
      current: {
        customerId: record.customerId,
        subscriptionId: record.subscriptionId,
        subscriptionItemId: record.subscriptionItemId,
      },
      new: {
        customerId: newCustomerId,
        subscriptionId: newSubscriptionId,
        subscriptionItemId: newSubscriptionItemId,
      },
      affectedRecords,
    };
  }

  const hasMetadataSubscription = !!(metadata && "subscriptionId" in metadata);
  const metadataUpdate = hasMetadataSubscription
    ? { teamId: record.teamId, currentMetadata: (team?.metadata as Record<string, unknown>) ?? {} }
    : null;

  const billingPayload = {
    customerId: newCustomerId,
    subscriptionId: newSubscriptionId,
    subscriptionItemId: newSubscriptionItemId,
  };

  if (entityType === "team") {
    await repo.transferTeamBilling(billingId, billingPayload, metadataUpdate);
  } else {
    await repo.transferOrgBilling(billingId, billingPayload, metadataUpdate);
  }

  log.info("Billing transfer executed", {
    adminUserId,
    billingId,
    entityType,
    teamId: record.teamId,
    teamName: team?.name,
    from: {
      customerId: record.customerId,
      subscriptionId: record.subscriptionId,
      subscriptionItemId: record.subscriptionItemId,
    },
    to: {
      customerId: newCustomerId,
      subscriptionId: newSubscriptionId,
      subscriptionItemId: newSubscriptionItemId,
    },
    metadataUpdated: hasMetadataSubscription,
    affectedRecords,
  });

  return { mode: "execute" as const, success: true };
};

export default transferBillingHandler;
