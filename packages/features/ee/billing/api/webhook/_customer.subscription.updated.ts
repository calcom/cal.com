import { PrismaPhoneNumberRepository } from "@calcom/lib/server/repository/PrismaPhoneNumberRepository";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { prisma } from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import { BillingRepositoryFactory } from "../../repository/billingRepositoryFactory";
import { TeamSubscriptionEventHandler } from "../../service/TeamSubscriptionEventHandler";
import type { SWHMap } from "./__handler";
import { HttpCode } from "./__handler";
import { mapStripeStatusToCalStatus } from "./lib/mapStripeStatusToCalStatus";

type Data = SWHMap["customer.subscription.updated"]["data"];

const handler = async (data: Data) => {
  const subscription = data.object;

  if (!subscription.id) {
    throw new HttpCode(400, "Subscription ID not found");
  }

  // A subscription will only have one of these products
  const teamSubscriptionItem = subscription.items.data.find(
    (item) => item.price.product === process.env.STRIPE_TEAM_PRODUCT_ID
  );

  const orgSubscriptionItem = subscription.items.data.find(
    (item) => item.price.product === process.env.STRIPE_ORG_PRODUCT_ID
  );

  const subscriptionItem = orgSubscriptionItem || teamSubscriptionItem;

  // Handle team subscriptions
  if (subscriptionItem) {
    await handleTeamSubscriptionUpdate({
      subscription,
      subscriptionItem,
      isOrganization: !!orgSubscriptionItem,
    });
    return { success: true, subscriptionId: subscription.id, subscriptionStatus: subscription.status };
  }

  const phoneNumber = await PrismaPhoneNumberRepository.findByStripeSubscriptionId({
    stripeSubscriptionId: subscription.id,
  });

  if (!phoneNumber) {
    throw new HttpCode(202, "Phone number not found");
  }

  return await handleCalAIPhoneNumberSubscriptionUpdate(subscription, phoneNumber);
};

type Subscription = Data["object"];
type SubscriptionItem = Data["object"]["items"]["data"][number];

async function handleCalAIPhoneNumberSubscriptionUpdate(
  subscription: Subscription,
  phoneNumber: { id: number; phoneNumber: string }
) {
  // Map Stripe subscription status to our enum
  const statusMap: Record<string, PhoneNumberSubscriptionStatus> = {
    active: PhoneNumberSubscriptionStatus.ACTIVE,
    past_due: PhoneNumberSubscriptionStatus.PAST_DUE,
    canceled: PhoneNumberSubscriptionStatus.CANCELLED,
    incomplete: PhoneNumberSubscriptionStatus.INCOMPLETE,
    incomplete_expired: PhoneNumberSubscriptionStatus.INCOMPLETE_EXPIRED,
    trialing: PhoneNumberSubscriptionStatus.TRIALING,
    unpaid: PhoneNumberSubscriptionStatus.UNPAID,
    paused: PhoneNumberSubscriptionStatus.CANCELLED,
  };

  const subscriptionStatus = statusMap[subscription.status] || PhoneNumberSubscriptionStatus.UNPAID;

  await prisma.calAiPhoneNumber.update({
    where: {
      id: phoneNumber.id,
    },
    data: {
      subscriptionStatus,
    },
  });

  return { success: true, subscriptionId: subscription.id, status: subscriptionStatus };
}

async function handleTeamSubscriptionUpdate({
  subscription,
  subscriptionItem,
  isOrganization,
}: {
  subscription: Subscription;
  subscriptionItem: SubscriptionItem;
  isOrganization: boolean;
}) {
  const billingRepository = BillingRepositoryFactory.getRepository(isOrganization);
  const teamRepository = new TeamRepository(prisma);
  const teamSubscriptionEventHandler = new TeamSubscriptionEventHandler(billingRepository, teamRepository);

  const status = mapStripeStatusToCalStatus({
    stripeStatus: subscription.status,
    subscriptionId: subscription.id,
  });

  try {
    await teamSubscriptionEventHandler.handleUpdate({
      subscriptionId: subscription.id,
      subscriptionItemId: subscriptionItem.id,
      customerId: subscription.customer as string,
      subscriptionStatus: status,
    });
  } catch (error) {
    console.error("Error handling team subscription update:", error);
    throw new HttpCode(202, "Failed to handle team subscription update");
  }
}

export default handler;
