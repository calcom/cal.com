import { MembershipRole, UserPlan } from "@prisma/client";
import Stripe from "stripe";

import { getStripeCustomerFromUser } from "@ee/lib/stripe/customer";

import { HttpError } from "@lib/core/http/error";
import prisma from "@lib/prisma";

import stripe from "./server";

// get team owner's Pro Plan subscription from Cal userId
export async function getProPlanSubscription(userId: number) {
  const stripeCustomerId = await getStripeCustomerFromUser(userId);

  if (!stripeCustomerId) return null;

  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ["subscriptions.data.plan"],
  });

  if (customer.deleted) throw new HttpError({ statusCode: 404, message: "Stripe customer not found" });

  // get the first subscription item which should be the Pro Plan
  return customer.subscriptions?.data[0];
}

//  freeSeats: the number of seats taken by the owner and any PRO members
//  unpaidSeats: the number of seats needed to purchase, including trial members.
export async function calculateTeamSeats(teamId: number) {
  // get all members of the team
  const memberships = await prisma.membership.findMany({
    where: { teamId },
    select: { role: true, accepted: true, user: { select: { plan: true } } },
  });

  // if the member is already PRO or is the team's owner the seat is considered free
  const freeSeats = memberships.filter(
    (m) => m.role === MembershipRole.OWNER || m.user.plan === UserPlan.PRO
  ).length;
  // including trial members, this is the amount of seats a team owner should purchase when upgrading to flexible pro
  const unpaidSeats = memberships.filter(
    (m) => m.user.plan === UserPlan.TRIAL || m.user.plan === UserPlan.FREE
  ).length;
  // the amount of members who's trial has expired and are now hidden from view
  const hiddenMembers = memberships.filter((m) => m.user.plan === UserPlan.FREE).length;

  return { totalMembers: memberships.length, freeSeats, unpaidSeats, hiddenMembers };
}

// this is called by the team owner when they are ready to upgrade their team to pro
export async function upgradeToPerSeatPricing(userId: number, teamId: number) {
  const subscription = await getProPlanSubscription(userId);

  if (!subscription) throw new HttpError({ statusCode: 404, message: "No pro subscription found" });

  const seats = await calculateTeamSeats(teamId);

  console.log({ seats });
  // update the subscription with Stripe
  const stripeResponse = await updatePerSeatPricing(subscription, seats.unpaidSeats);

  console.log({ subscription: stripeResponse.items.data });
  // upgrade all local accounts of team members to Pro
  const memberships = await prisma.membership.findMany({
    where: { teamId },
    select: { role: true, accepted: true, user: { select: { id: true, plan: true } } },
  });

  console.log({ memberships: memberships.map((m) => m.user) });
  // loop through all members and update their account to Pro
  for (const member of memberships) {
    // skip if the member is the owner, invitee or already Pro
    if (member.role === MembershipRole.OWNER || member.user.plan === UserPlan.PRO) continue;

    await prisma.user.update({
      where: { id: member.user.id },
      data: { plan: UserPlan.PRO },
    });
  }
}

// depending on the state of the owner's Stripe subscription, we either create a new subscription or update the existing one
async function updatePerSeatPricing(subscription: Stripe.Subscription, quantity: number) {
  const perSeatProPlan = subscription.items.data.find((item) => item.plan.id === getPerSeatProPlanPrice());

  return stripe.subscriptions.update(subscription.id, {
    items: [
      // if their subscription does not contain Per Seat Pro, add it—otherwise, update the existing one
      perSeatProPlan ? { id: perSeatProPlan.id, quantity } : { plan: getPerSeatProPlanPrice(), quantity },
    ],
  });
}

// shared logic for add/removing members, called on member invite and member removal/leave
async function addOrRemoveSeat(userId: number, teamId: number, remove: boolean, memberUserId?: number) {
  console.log("adding/removing member", { userId, teamId, remove, memberUserId });
  const subscription = await getProPlanSubscription(userId);
  // get the per seat plan from the subscription
  const perSeatProPlanPrice = subscription?.items.data.find(
    (item) => item.plan.id === getPerSeatProPlanPrice()
  );
  // find the member's local user account
  const memberUser = await prisma.user.findUnique({
    where: { id: memberUserId },
    select: { plan: true },
  });
  // check if user already has pro
  const memberHasPro = memberUser?.plan === UserPlan.PRO;

  console.log({ subscription, memberHasPro, memberUser });

  if (subscription && !memberHasPro) {
    console.log("adding per seat pricing...");
    // takes care of either adding per seat pricing, or updating the existing one's quantity
    const stripeResponse = await updatePerSeatPricing(
      subscription,
      remove ? (perSeatProPlanPrice?.quantity ?? 0) - 1 : (perSeatProPlanPrice?.quantity ?? 0) + 1
    );
    console.log({ stripeResponse });
  }
  await prisma.user.update({
    where: { id: memberUserId },
    data: { plan: remove ? UserPlan.FREE : UserPlan.PRO },
  });
}
// called once an invitation is accepted
export async function addSeat(userId: number, teamId: number, memberUserId?: number) {
  return await addOrRemoveSeat(userId, teamId, false, memberUserId);
}
// called after a member is removed from a team
export async function removeSeat(userId: number, teamId: number, memberUserId?: number) {
  return await addOrRemoveSeat(userId, teamId, true, memberUserId);
}

// if a team has failed to pay for the pro plan, downgrade all team members to free
export async function downgradeTeamMembers(teamId: number) {
  const memberships = await prisma.membership.findMany({
    where: { teamId },
    select: { role: true, accepted: true, user: { select: { id: true, plan: true } } },
  });

  for (const member of memberships) {
    // skip if the member is the owner or not Pro
    if (member.role === MembershipRole.OWNER || member.user.plan !== UserPlan.PRO) continue;

    // check to see if this user has an active Stripe subscription
    const subscription = await getProPlanSubscription(member.user.id);
    // if they do we'll skip downgrading them
    if (subscription?.items.data.length) continue;
    // if (subscription.items.data[0]?.price?.id === getProPlanPrice()) continue;

    // otherwise we'll downgrade them
    await prisma.user.update({
      where: { id: member.user.id },
      data: { plan: UserPlan.FREE },
    });
  }
}

// some accounts already have a pro subscription, we do not need to introduce flexible pro billing for these users
export async function checkIfSeatNeedsPurchase(usernameOrEmail: string) {
  const invitee = await prisma.user.findFirst({
    where: {
      OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    },
  });
  const memberExists = !!invitee;
  return {
    requiresSeatPurchase: !memberExists || invitee.plan !== UserPlan.PRO,
  };
}

export function getPerSeatProPlanPrice(): string {
  const proPlanPrice =
    process.env.NODE_ENV === "production"
      ? "price_1KHkoeH8UDiwIftkkUbiggsM"
      : "price_1KLD4GH8UDiwIftkWQfsh1Vh";
  return proPlanPrice;
}

export function getProPlanPrice(): string {
  const proPlanPrice =
    process.env.NODE_ENV === "production"
      ? "price_1Isw0bH8UDiwIftkETa8lRcj"
      : "price_1JZ0J3H8UDiwIftk0YIHYKr8";
  return proPlanPrice;
}
