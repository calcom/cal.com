import { ENTERPRISE_SLUGS } from "@calcom/features/ee/billing/constants";
import {
  getOrgDunningRepository,
  getTeamDunningRepository,
} from "@calcom/features/ee/billing/di/containers/Billing";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type Props = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const log = logger.getSubLogger({ prefix: ["getDueInvoiceBannerData"] });

async function getLatestOpenInvoiceUrl(subscriptionId: string): Promise<string | null> {
  try {
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      status: "open",
      limit: 1,
    });
    return invoices.data[0]?.hosted_invoice_url ?? null;
  } catch (err) {
    log.warn("Failed to fetch open invoice from Stripe", { subscriptionId, err });
    return null;
  }
}

export const getDueInvoiceBannerDataHandler = async ({ ctx }: Props) => {
  const membershipRepository = new MembershipRepository();
  const teamDunningRepository = getTeamDunningRepository();
  const orgDunningRepository = getOrgDunningRepository();

  const memberships = await membershipRepository.findAllByUserId({
    userId: ctx.user.id,
    filters: { accepted: true, roles: [MembershipRole.ADMIN, MembershipRole.OWNER] },
  });

  const teamIds = memberships.map((m) => m.teamId);
  if (teamIds.length === 0) return [];

  const [teamDunningRecords, orgDunningRecords] = await Promise.all([
    teamDunningRepository.findByTeamIds(teamIds),
    orgDunningRepository.findByTeamIds(teamIds),
  ]);
  const dunningRecords = [...teamDunningRecords, ...orgDunningRecords];

  const records = await Promise.all(
    dunningRecords.map(async (record) => {
      const invoiceUrl = record.subscriptionId
        ? await getLatestOpenInvoiceUrl(record.subscriptionId)
        : null;

      return {
        teamId: record.teamId,
        teamName: record.entityName,
        isOrganization: record.isOrganization,
        status: record.status,
        firstFailedAt: record.firstFailedAt,
        invoiceUrl,
        failureReason: record.failureReason,
        isEnterprise: record.entitySlug ? ENTERPRISE_SLUGS.includes(record.entitySlug) : false,
      };
    })
  );

  return records;
};
