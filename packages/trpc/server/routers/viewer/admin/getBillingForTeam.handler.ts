import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TGetBillingForTeamSchema } from "./getBillingForTeam.schema";

type GetBillingForTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetBillingForTeamSchema;
};

const getBillingForTeamHandler = async ({ input }: GetBillingForTeamOptions) => {
  const { teamId } = input;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      slug: true,
      isOrganization: true,
      teamBilling: {
        select: {
          id: true,
          billingMode: true,
          billingPeriod: true,
          pricePerSeat: true,
          paidSeats: true,
          subscriptionId: true,
          subscriptionItemId: true,
          customerId: true,
          status: true,
          planName: true,
          subscriptionStart: true,
          subscriptionEnd: true,
          subscriptionTrialEnd: true,
        },
      },
      organizationBilling: {
        select: {
          id: true,
          billingMode: true,
          billingPeriod: true,
          pricePerSeat: true,
          paidSeats: true,
          subscriptionId: true,
          subscriptionItemId: true,
          customerId: true,
          status: true,
          planName: true,
          subscriptionStart: true,
          subscriptionEnd: true,
          subscriptionTrialEnd: true,
        },
      },
    },
  });

  if (!team) {
    return { found: false as const };
  }

  const billing = team.isOrganization ? team.organizationBilling : team.teamBilling;

  return {
    found: true as const,
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      isOrganization: team.isOrganization,
    },
    billing: billing
      ? {
          id: billing.id,
          billingMode: billing.billingMode,
          billingPeriod: billing.billingPeriod,
          pricePerSeat: billing.pricePerSeat,
          paidSeats: billing.paidSeats,
          subscriptionId: billing.subscriptionId,
          subscriptionItemId: billing.subscriptionItemId,
          customerId: billing.customerId,
          status: billing.status,
          planName: billing.planName,
          subscriptionStart: billing.subscriptionStart,
          subscriptionEnd: billing.subscriptionEnd,
          subscriptionTrialEnd: billing.subscriptionTrialEnd,
        }
      : null,
  };
};

export default getBillingForTeamHandler;
