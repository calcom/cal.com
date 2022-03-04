#!/usr/bin/env ts-node
// To run this script: `yarn downgrade 2>&1 | tee result.log`
import { MembershipRole, Prisma, UserPlan } from "@prisma/client";
import dayjs from "dayjs";

import prisma from "@calcom/prisma";
import stripe from "@calcom/stripe/server";

import { TRIAL_LIMIT_DAYS } from "@lib/config/constants";

import { getStripeCustomerIdFromUserId } from "./customer";
import { getPremiumPlanPrice, getProPlanPrice, getProPlanProduct } from "./team-billing";

export async function downgradeIllegalProUsers() {
  const illegalProUsers = await prisma.user.findMany({
    where: {
      plan: UserPlan.PRO,
    },
    select: {
      id: true,
      email: true,
      username: true,
      plan: true,
      metadata: true,
    },
  });
  console.table(illegalProUsers);
  const usersDowngraded: Partial<typeof illegalProUsers[number]>[] = [];
  const downgrade = async (user: typeof illegalProUsers[number]) => {
    console.log(`Downgrading: ${user.email}`);
    // await prisma.user.update({
    //   where: { id: member.id },
    //   data: {
    //     plan: UserPlan.TRIAL,
    //     trialEndsAt: dayjs().add(TRIAL_LIMIT_DAYS, "day").toDate(),
    //   },
    // });
    console.log(`Downgraded: ${user.email}`);
    usersDowngraded.push({
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan,
      metadata: user.metadata,
    });
  };
  for (const member of illegalProUsers) {
    const metadata = (member.metadata as Prisma.JsonObject) ?? {};
    // if their pro is already sponsored by a team, do not downgrade
    if (metadata.proPaidForByTeamId !== undefined) continue;

    const stripeCustomerId = await getStripeCustomerIdFromUserId(member.id);
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ["subscriptions.data.plan"],
    });
    if (!customer || customer.deleted) {
      await downgrade(member);
      continue;
    }

    const subscription = customer.subscriptions?.data[0];
    if (!subscription) {
      await downgrade(member);
      continue;
    }

    const hasProPlan = !!subscription.items.data.find(
      (item) => item.plan.product === getProPlanProduct() || item.plan.id === getProPlanPrice,
      getProPlanProduct() || item.plan.id === getPremiumPlanPrice()
    );
    // if they're pro, do not downgrade
    if (hasProPlan) continue;

    await downgrade(member);
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
