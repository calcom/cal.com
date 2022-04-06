#!/usr/bin/env ts-node
// To run this script: `yarn downgrade 2>&1 | tee result.log`
import { Prisma, UserPlan } from "@prisma/client";
import dayjs from "dayjs";

import { TRIAL_LIMIT_DAYS } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import stripe from "@calcom/stripe/server";

// import { isPremiumUserName } from "../../apps/website/lib/username";
import { getStripeCustomerIdFromUserId } from "./customer";
import { getPremiumPlanPrice, getProPlanPrice, getProPlanProduct } from "./utils";

export async function downgradeIllegalProUsers() {
  const illegalProUsers = await prisma.user.findMany({
    where: {
      plan: UserPlan.PRO,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      plan: true,
      metadata: true,
    },
  });
  const usersDowngraded: Partial<typeof illegalProUsers[number]>[] = [];
  const downgrade = async (user: typeof illegalProUsers[number]) => {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: UserPlan.TRIAL,
        trialEndsAt: dayjs().add(TRIAL_LIMIT_DAYS, "day").toDate(),
      },
    });
    console.log(`Downgraded: ${user.email}`);
    usersDowngraded.push({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      plan: user.plan,
      metadata: user.metadata,
    });
  };
  for (const suspectUser of illegalProUsers) {
    console.log(`Checking: ${suspectUser.email}`);
    const metadata = (suspectUser.metadata as Prisma.JsonObject) ?? {};
    // if their pro is already sponsored by a team, do not downgrade
    if (metadata.proPaidForByTeamId !== undefined) continue;

    const stripeCustomerId = await getStripeCustomerIdFromUserId(suspectUser.id);
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ["subscriptions.data.plan"],
    });
    if (!customer || customer.deleted) {
      await downgrade(suspectUser);
      continue;
    }

    const subscription = customer.subscriptions?.data[0];
    if (!subscription) {
      await downgrade(suspectUser);
      continue;
    }

    const hasProPlan = !!subscription.items.data.find(
      (item) =>
        item.plan.product === getProPlanProduct() ||
        [getProPlanPrice(), getPremiumPlanPrice()].includes(item.plan.id)
    );
    // if they're pro, do not downgrade
    if (hasProPlan) continue;

    // If they already have a premium username, do not downgrade
    // if (suspectUser.username && isPremiumUserName(suspectUser.username)) continue;

    await downgrade(suspectUser);
  }
  return {
    usersDowngraded,
    usersDowngradedAmount: usersDowngraded.length,
  };
}

downgradeIllegalProUsers()
  .then(({ usersDowngraded, usersDowngradedAmount }) => {
    console.log(`Downgraded ${usersDowngradedAmount} illegal pro users`);
    console.table(usersDowngraded);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
