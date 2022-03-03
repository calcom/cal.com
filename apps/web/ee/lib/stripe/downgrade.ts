#!/usr/bin/env ts-node
// To run this script: `yarn downgrade 2>&1 | tee result.log`
import { MembershipRole, Prisma, UserPlan } from "@prisma/client";
import dayjs from "dayjs";

import prisma from "@calcom/prisma";

import { TRIAL_LIMIT_DAYS } from "@lib/config/constants";

import { getStripeCustomerIdFromUserId } from "./customer";
import stripe from "./server";
import { getPremiumPlanPrice, getProPlanPrice } from "./team-billing";

export async function downgradeIllegalProUsers() {
  const usersDowngraded: string[] = [];
  const illegalProUsers = await prisma.membership.findMany({
    where: {
      role: {
        not: MembershipRole.OWNER,
      },
      user: {
        plan: {
          not: UserPlan.PRO,
        },
      },
    },
    include: {
      user: true,
    },
  });
  const downgrade = async (member: typeof illegalProUsers[number]) => {
    console.log(`Downgrading: ${member.user.email}`);
    await prisma.user.update({
      where: { id: member.user.id },
      data: {
        plan: UserPlan.TRIAL,
        trialEndsAt: dayjs().add(TRIAL_LIMIT_DAYS, "day").toDate(),
      },
    });
    console.log(`Downgraded: ${member.user.email}`);
    usersDowngraded.push(member.user.username || `${member.user.id}`);
  };
  for (const member of illegalProUsers) {
    const metadata = (member.user.metadata as Prisma.JsonObject) ?? {};
    // if their pro is already sponsored by a team, do not downgrade
    if (metadata.proPaidForTeamId !== undefined) continue;

    const stripeCustomerId = await getStripeCustomerIdFromUserId(member.user.id);
    if (!stripeCustomerId) {
      await downgrade(member);
      continue;
    }

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
      (item) => item.plan.id === getProPlanPrice() || item.plan.id === getPremiumPlanPrice()
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
