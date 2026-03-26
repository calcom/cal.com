import {
  getBillingProviderService,
  getBillingRepositoryFactory,
} from "@calcom/ee/billing/di/containers/Billing";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TListInvoicesInputSchema } from "./listInvoices.schema";

const log = logger.getSubLogger({ prefix: ["listInvoices"] });

type ListInvoicesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListInvoicesInputSchema;
};

export interface InvoiceLineItem {
  id: string;
  description: string | null;
  amount: number;
  quantity: number | null;
}

export interface InvoicePaymentMethod {
  type: string;
  card?: {
    last4: string;
    brand: string;
  };
}

export interface Invoice {
  id: string;
  number: string | null;
  created: number;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  lineItems: InvoiceLineItem[];
  description: string | null;
  paymentMethod: InvoicePaymentMethod | null;
}

export const listInvoicesHandler = async ({ ctx, input }: ListInvoicesOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    return { invoices: [] as Invoice[], hasMore: false, nextCursor: null };
  }

  const { teamId, limit, cursor, startDate, endDate } = input;

  // Get team to determine type and check permissions
  const teamRepository = new TeamRepository(prisma);
  const team = await teamRepository.findById({ id: teamId });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  // Permission check
  const permissionService = new PermissionCheckService();
  const hasPermission = await permissionService.checkPermission({
    userId: ctx.user.id,
    teamId,
    permission: team.isOrganization ? "organization.manageBilling" : "team.manageBilling",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to view invoices",
    });
  }

  // Look up billing record from TeamBilling or OrganizationBilling table
  const billingRepository = getBillingRepositoryFactory()(team.isOrganization);
  const billingRecord = await billingRepository.findFullByTeamId(teamId);

  if (!billingRecord) {
    return { invoices: [] as Invoice[], hasMore: false, nextCursor: null };
  }

  const { subscriptionId, customerId } = billingRecord;

  try {
    const billingService = getBillingProviderService();

    // Fetch invoices using the billing service, filtered by subscription and date range
    const invoicesResponse = await billingService.listInvoices({
      customerId,
      subscriptionId,
      limit: limit + 1, // Fetch one extra to check if there are more
      startingAfter: cursor || undefined,
      createdGte: startDate ? Math.floor(startDate.getTime() / 1000) : undefined,
      createdLte: endDate ? Math.floor(endDate.getTime() / 1000) : undefined,
    });

    const hasMore = invoicesResponse.invoices.length > limit;
    const invoices = invoicesResponse.invoices.slice(0, limit);
    const nextCursor = hasMore && invoices.length > 0 ? invoices[invoices.length - 1]?.id : null;

    return {
      invoices: invoices as Invoice[],
      hasMore,
      nextCursor,
    };
  } catch (error) {
    log.error("Failed to fetch invoices", { teamId, error });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch invoices",
    });
  }
};

export default listInvoicesHandler;
