// TODO:
// - stripe quantity does not decrease when a member leaves
// - nothing happens after going through billing portal, callback handling is not implemented
//
import { MembershipRole, Prisma, UserPlan } from "@prisma/client";
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

async function getMembersMissingSeats(teamId: number) {
  const members = await prisma.membership.findMany({
    where: { teamId },
    select: { role: true, accepted: true, user: { select: { id: true, plan: true, metadata: true } } },
  });
  const membersMissingSeats = members.filter((m) => {
    const metadata = (m.user.metadata as Prisma.JsonObject) ?? {};
    // if user is the owner of the team
    if (m.role === MembershipRole.OWNER) return false;
    // if user has Pro paid for by another team
    if (m.user.plan === UserPlan.PRO && metadata.proPaidForByTeamId !== teamId) return false;
    // all other Free & Trial users are missing seats
    return true;
  });
  return {
    members,
    membersMissingSeats,
  };
}

// a helper for the upgrade dialog
export async function getTeamSeatStats(teamId: number) {
  const { membersMissingSeats, members } = await getMembersMissingSeats(teamId);
  return {
    totalMembers: members.length,
    // members we need not pay for
    freeSeats: members.length - membersMissingSeats.length,
    // members we need to pay for
    missingSeats: membersMissingSeats.length,
    // members who have been hidden from view
    hiddenMembers: members.filter((m) => m.user.plan === UserPlan.FREE).length,
  };
}

// depending on the state of the owner's Stripe subscription we either create a new subscription or update the existing one
async function updatePerSeatQuantity(subscription: Stripe.Subscription, quantity: number) {
  const perSeatProPlan = subscription.items.data.find((item) => item.plan.id === getPerSeatProPlanPrice());

  // if their subscription does not contain Per Seat Pro, add it—otherwise, update the existing one
  return await stripe.subscriptions.update(subscription.id, {
    items: [
      perSeatProPlan ? { id: perSeatProPlan.id, quantity } : { plan: getPerSeatProPlanPrice(), quantity },
    ],
  });
}

// called by the team owner when they are ready to upgrade their team to Per Seat Pro
// if user has no subscription, this will be called again after successful stripe checkout callback, with subscription now present
export async function upgradeToPerSeatPricing(userId: number, teamId: number) {
  const subscription = await getProPlanSubscription(userId);
  const { membersMissingSeats } = await getMembersMissingSeats(teamId);

  if (!subscription) {
    // in this case, the user already has Pro without a Stripe subscription, eg: they're in another team sponsoring their Pro membership
    const ownerUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (ownerUser?.plan !== UserPlan.PRO)
      throw new HttpError({ statusCode: 400, message: "User is not a pro" });

    const customer = await getStripeCustomerFromUser(userId);
    if (!customer) throw new HttpError({ statusCode: 400, message: "User has no Stripe customer" });

    // create a checkout session with the quantity of missing seats
    const session = await createPerSeatProCheckoutSession(customer, membersMissingSeats.length);
    // return checkout session url for redirect
    return { url: session.url };
  }

  // update the subscription with Stripe
  await updatePerSeatQuantity(subscription, membersMissingSeats.length);

  // loop through all members and update their account to Pro
  for (const member of membersMissingSeats) {
    await prisma.user.update({
      where: { id: member.user.id },
      data: {
        plan: UserPlan.PRO,
        // declare which team is sponsoring their Pro membership
        metadata: { proPaidForByTeamId: teamId, ...((member.user.metadata as Prisma.JsonObject) ?? {}) },
      },
    });
  }
  return { success: true };
}

// shared logic for add/removing members, called on member invite and member removal/leave
async function addOrRemoveSeat(remove: boolean, userId: number, teamId: number, memberUserId?: number) {
  console.log(remove ? "removing member" : "adding member", { userId, teamId, memberUserId });

  const subscription = await getProPlanSubscription(userId);
  // get the per seat plan from the subscription
  const perSeatProPlanPrice = subscription?.items.data.find(
    (item) => item.plan.id === getPerSeatProPlanPrice()
  );
  // find the member's local user account
  const memberUser = await prisma.user.findUnique({
    where: { id: memberUserId },
    select: { plan: true, metadata: true },
  });
  // check if user already has pro
  const memberHasPro = memberUser?.plan === UserPlan.PRO;

  if (subscription && !memberHasPro) {
    // takes care of either adding per seat pricing, or updating the existing one's quantity
    await updatePerSeatQuantity(
      subscription,
      remove ? (perSeatProPlanPrice?.quantity ?? 1) - 1 : (perSeatProPlanPrice?.quantity ?? 0) + 1
    );
  }
  if (subscription && memberUser) {
    // add or remove proPaidForByTeamId from metadata
    const metadata: Record<string, unknown> = {
      proPaidForByTeamId: teamId,
      ...((memberUser.metadata as Prisma.JsonObject) ?? {}),
    };
    // entirely remove property if removing member from team and proPaidForByTeamId is this team
    if (remove && metadata.proPaidForByTeamId === teamId) delete metadata.proPaidForByTeamId;

    await prisma.user.update({
      where: { id: memberUserId },
      data: { plan: remove ? UserPlan.FREE : UserPlan.PRO, metadata: metadata as Prisma.JsonObject },
    });
  }
}

// this function verifies that the subscription's quantity is correct for the number of members the team has
// this is a fallback just in case a member leaves without triggering the downgrade process
export async function ensureSubscriptionQuantityCorrectness(userId: number, teamId: number) {
  const subscription = await getProPlanSubscription(userId);
  const stripeQuantity =
    subscription?.items.data.find((item) => item.plan.id === getPerSeatProPlanPrice())?.quantity ?? 0;

  const { membersMissingSeats } = await getMembersMissingSeats(teamId);

  // correct the quantity if missing seats is out of sync with subscription quantity
  if (subscription && membersMissingSeats.length !== stripeQuantity) {
    await updatePerSeatQuantity(subscription, membersMissingSeats.length);
  }
}

// aliased helpers for more verbose usage
export async function addSeat(userId: number, teamId: number, memberUserId?: number) {
  return await addOrRemoveSeat(false, userId, teamId, memberUserId);
}
export async function removeSeat(userId: number, teamId: number, memberUserId?: number) {
  return await addOrRemoveSeat(true, userId, teamId, memberUserId);
}

// if a team has failed to pay for the pro plan, downgrade all team members to free
export async function downgradeTeamMembers(teamId: number) {
  const members = await prisma.membership.findMany({
    where: { teamId, user: { plan: UserPlan.PRO } },
    select: { role: true, accepted: true, user: { select: { id: true, plan: true, metadata: true } } },
  });

  for (const member of members) {
    //skip if user had their own Pro subscription
    const subscription = await getProPlanSubscription(member.user.id);
    if (subscription?.items.data.length) continue;

    // skip if Pro is paid for by another team
    const metadata = (member.user.metadata as Prisma.JsonObject) ?? {};
    if (metadata.proPaidForByTeamId !== teamId) continue;

    // downgrade only if their pro plan was paid for by this team
    delete metadata.proPaidForByTeamId;
    await prisma.user.update({
      where: { id: member.user.id },
      data: { plan: UserPlan.FREE, metadata },
    });
  }
}

async function createPerSeatProCheckoutSession(customerId: string, quantity: number) {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    line_items: [
      {
        price: getPerSeatProPlanPrice(),
        quantity: quantity ?? 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.NEXT_PUBLIC_APP_URL ?? "/",
    allow_promotion_codes: true,
  };

  return await stripe.checkout.sessions.create(params);
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
