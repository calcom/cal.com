import { MembershipRole, UserPlan } from "@prisma/client";

import { getStripeCustomerFromUser } from "@ee/lib/stripe/customer";

import { HttpError } from "@lib/core/http/error";
import prisma from "@lib/prisma";

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

  const seats = await calculateTeamSeats(teamId);

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

  // upgrade all local accounts of team members to Pro
  const memberships = await prisma.membership.findMany({
    where: { teamId },
    select: { role: true, accepted: true, user: { select: { id: true, plan: true } } },
  });
  // loop through all members and update their account to Pro
  for (const member of memberships) {
    // skip if the member is the owner, invitee or not Pro
    if (member.role === MembershipRole.OWNER || !member.accepted || member.user.plan !== UserPlan.PRO)
      continue;

    await prisma.user.update({
      where: { id: member.user.id },
      data: { plan: UserPlan.PRO },
    });
  }
}

// if a team has failed to pay for the pro plan, downgrade all team members to free
export async function downgradeTeamMembers(teamId: number) {
  const memberships = await prisma.membership.findMany({
    where: { teamId },
    select: { role: true, accepted: true, user: { select: { id: true, plan: true } } },
  });

  for (const member of memberships) {
    // skip if the member is the owner, invitee or not Pro
    if (member.role === MembershipRole.OWNER || !member.accepted || member.user.plan !== UserPlan.PRO)
      continue;

    // check to see if this user has an active Stripe subscription
    const subscription = await getStripeSubscription(member.user.id);
    // if they do we'll skip downgrading them
    if (subscription.items.data[0]?.price?.id === getProPlanPrice()) continue;
    // otherwise we'll downgrade them
    await prisma.user.update({
      where: { id: member.user.id },
      data: { plan: UserPlan.FREE },
    });
  }
}

async function addOrRemoveSeat(userId: number, remove = false, memberUserId: number) {
  const subscription = await getStripeSubscription(userId);
  const primarySubscriptionItem = subscription.items.data[0]; // todo: convert to find()
  if (!primarySubscriptionItem)
    throw new HttpError({ statusCode: 404, message: "No pro subscription found" });
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
  teamId: number
): Promise<{ unpaidSeats: number; freeSeats: number }> {
  let freeSeats = 0;
  let unpaidSeats = 0;
  // get all members of the team
  const memberships = await prisma.membership.findMany({
    where: { teamId },
    select: { role: true, accepted: true, user: { select: { plan: true } } },
  });
  // calculate numbers
  for (const member of memberships) {
    // invitees don't count until accepted
    if (!member.accepted) continue;
    // if the member is already PRO or is the team's owner the seat is considered free
    if (member.role === MembershipRole.OWNER || member.user.plan === UserPlan.PRO) freeSeats++;
    // otherwise for TRIAL and FREE, the seat is considered unpaid
    else if (member.user.plan === UserPlan.TRIAL || member.user.plan === UserPlan.FREE) unpaidSeats++;
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
