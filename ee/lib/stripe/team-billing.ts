import { MembershipRole, UserPlan } from "@prisma/client";
import Stripe from "stripe";

import { getStripeCustomerFromUser } from "@ee/lib/stripe/customer";

import { HttpError } from "@lib/core/http/error";
import prisma from "@lib/prisma";
import { getTeamWithMembers } from "@lib/queries/teams";

import stripe from "./server";

// helper to get team owner stripe customer from userId
export async function getStripeSubscription(userId: number) {
  //get user from prisma
  const stripeCustomerId = await getStripeCustomerFromUser(userId);

  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ["subscriptions.data.plan"],
  });

  if (customer.deleted) throw new HttpError({ statusCode: 404, message: "Stripe customer not found" });

  if (!customer.subscriptions?.data?.length)
    throw new HttpError({ statusCode: 404, message: "Stripe customer subscription not found" });

  // get the first subscription item, add checks here to confirm it's the pro plan
  return customer.subscriptions?.data[0];
}

// this is called by the team owner when they are ready to upgrade their team to pro
export async function upgradeToFlexiblePro(userId: number, teamId: number) {
  const subscription = await getStripeSubscription(userId);

  const seats = await calculateTeamSeats(subscription, userId, teamId);

  // update the subscription with Stripe
  await stripe.subscriptions.update(subscription.id, {
    items: [
      {
        id: subscription.items.data[0].id,
        plan: getFlexibleProPlanPrice(),
        quantity: seats.unpaidSeats,
      },
    ],
  });

  // upgrade local accounts to pro
  const team = await getTeamWithMembers(teamId);
  if (!team?.members) throw new HttpError({ statusCode: 404, message: "No members to update" });
  // loop through all members and update their account to pro
  for (const member of team?.members) {
    if (member.role != MembershipRole.OWNER)
      await prisma.user.update({
        where: { id: member.id },
        data: { plan: UserPlan.PRO },
      });
  }
}

// if a team has failed to pay for the pro plan, downgrade all team members to free
export async function downgradeTeamMembers(teamId: number) {
  const team = await getTeamWithMembers(teamId);
  if (!team?.members) throw new HttpError({ statusCode: 404, message: "No members to update" });
  for (const member of team?.members) {
    // check to see if this user has an active Stripe subscription
    const subscription = await getStripeSubscription(member.id);
    // if they do we'll skip downgrading them
    if (subscription.items.data[0].price.id === getProPlanPrice()) continue;
    // otherwise we'll downgrade them
    await prisma.user.update({
      where: { id: member.id },
      data: { plan: UserPlan.FREE },
    });
  }
}

async function addOrRemoveSeat(userId: number, remove = false, memberUserId: number) {
  const subscription = await getStripeSubscription(userId);
  const primarySubscriptionItem = subscription.items.data[0];
  // check if user already has pro
  const hasPro = primarySubscriptionItem.price.id === getProPlanPrice();

  if (!hasPro) {
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: primarySubscriptionItem.price.id,
          plan: getFlexibleProPlanPrice(),
          quantity: remove
            ? primarySubscriptionItem.quantity || 0 - 1
            : primarySubscriptionItem.quantity || 0 + 1,
        },
      ],
    });
    await prisma.user.update({
      where: { id: memberUserId },
      data: { plan: UserPlan.FREE },
    });
  }
}
// called once an invitation is accepted
export async function addSeat(userId: number, memberUserId: number) {
  return await addOrRemoveSeat(userId, true, memberUserId);
}
// called after a member is removed from a team
export async function removeSeat(userId: number, memberUserId: number) {
  return await addOrRemoveSeat(userId, false, memberUserId);
}

//  freeSeats: the number of seats taken by the owner and any PRO members
//  unpaidSeats: the number of seats needed to purchase, including trial members.
export async function calculateTeamSeats(
  subscription: Stripe.Subscription,
  userId: number,
  teamId: number
): Promise<{ unpaidSeats: number; freeSeats: number }> {
  let freeSeats = 0;
  let unpaidSeats = 0;
  // get all team members with account status
  const team = await getTeamWithMembers(teamId);
  if (!team?.members) throw new HttpError({ statusCode: 404, message: "No members found in team" });
  // calculate numbers
  for (const member of team?.members) {
    const memberAccountPlan = await prisma.user.findFirst({
      where: { id: member.id },
      select: { plan: true },
    });

    // if the member is a PRO, the seat is considered free
    if (memberAccountPlan?.plan === UserPlan.PRO) freeSeats++;
    // otherwise for TRIAL and FREE, the seat is considered unpaid
    else if (memberAccountPlan?.plan === UserPlan.TRIAL) unpaidSeats++;
    else if (memberAccountPlan?.plan === UserPlan.FREE) unpaidSeats++;
  }
  return { unpaidSeats, freeSeats };
}

export function getFlexibleProPlanPrice(): string {
  const proPlanPrice =
    process.env.NODE_ENV === "production"
      ? "price_1KHkoeH8UDiwIftkkUbiggsM"
      : "price_1JZ0J3H8UDiwIftk0YIHYKr8";
  return proPlanPrice;
}

export function getProPlanPrice(): string {
  const proPlanPrice =
    process.env.NODE_ENV === "production"
      ? "price_1Isw0bH8UDiwIftkETa8lRcj"
      : "price_1JZ0J3H8UDiwIftk0YIHYKr8";
  return proPlanPrice;
}
