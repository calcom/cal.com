import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import { Plan, SubscriptionStatus } from "@calcom/features/ee/billing/repository/IBillingRepository";
import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billing-service";
import { InternalTeamBilling } from "@calcom/features/ee/billing/teams/internal-team-billing";
import stripe from "@calcom/features/ee/payments/server/stripe";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

const querySchema = z.object({
  session_id: z.string().min(1),
});

const checkoutSessionMetadataSchema = z.object({
  teamName: z.string(),
  teamSlug: z.string(),
  userId: z.string().transform(Number),
  isOnboarding: z.string().optional(),
});

const generateRandomString = () => {
  return Math.random().toString(36).substring(2, 10);
};

async function getHandler(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const { session_id } = querySchema.parse({
    session_id: searchParams.get("session_id"),
  });

  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["subscription"],
  });
  if (!checkoutSession) throw new HttpError({ statusCode: 404, message: "Checkout session not found" });

  const subscription = checkoutSession.subscription as Stripe.Subscription;

  if (checkoutSession.payment_status !== "paid")
    throw new HttpError({ statusCode: 402, message: "Payment required" });

  // Let's query to ensure that the team metadata carried over from the checkout session.
  const parseCheckoutSessionMetadata = checkoutSessionMetadataSchema.safeParse(checkoutSession.metadata);

  if (!parseCheckoutSessionMetadata.success) {
    console.error(
      "Team metadata not found in checkout session",
      parseCheckoutSessionMetadata.error,
      checkoutSession.id
    );
  }

  if (!checkoutSession.metadata?.userId) {
    throw new HttpError({
      statusCode: 400,
      message: "Can't publish team/org without userId",
    });
  }

  const checkoutSessionMetadata = parseCheckoutSessionMetadata.success
    ? parseCheckoutSessionMetadata.data
    : {
        teamName: checkoutSession?.metadata?.teamName ?? generateRandomString(),
        teamSlug: checkoutSession?.metadata?.teamSlug ?? generateRandomString(),
        userId: checkoutSession.metadata.userId,
        isOnboarding: checkoutSession.metadata.isOnboarding,
      };

  const team = await prisma.team.create({
    data: {
      name: checkoutSessionMetadata.teamName,
      slug: checkoutSessionMetadata.teamSlug,
      members: {
        create: {
          userId: checkoutSessionMetadata.userId as number,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      metadata: {
        paymentId: checkoutSession.id,
        subscriptionId: subscription.id || null,
        subscriptionItemId: subscription.items.data[0].id || null,
      },
    },
  });

  if (checkoutSession && subscription) {
    const { subscriptionStart } = StripeBillingService.extractSubscriptionDates(subscription);
    const internalBillingService = new InternalTeamBilling(team);
    await internalBillingService.saveTeamBilling({
      teamId: team.id,
      subscriptionId: subscription.id,
      subscriptionItemId: subscription.items.data[0].id,
      customerId: subscription.customer as string,
      // TODO: Implement true subscription status when webhook events are implemented
      status: SubscriptionStatus.ACTIVE,
      planName: Plan.TEAM,
      subscriptionStart,
    });
  }

  // Check if this is from onboarding flow and redirect accordingly
  const isOnboarding = checkoutSessionMetadata.isOnboarding === "true";

  if (isOnboarding) {
    // Redirect to event-types for onboarding flow
    return NextResponse.redirect(new URL("/onboarding/personal/settings", WEBAPP_URL), {
      status: 302,
    });
  }

  // redirect to team screen
  return NextResponse.redirect(
    new URL(`/settings/teams/${team.id}/onboard-members?event=team_created`, req.nextUrl.origin),
    { status: 302 }
  );
}

export const GET = defaultResponderForAppDir(getHandler);
