import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { _MembershipModel as Membership, _TeamModel as Team } from "@calcom/prisma/zod";

const querySchema = z.object({
  session_id: z.string().min(1),
});

const checkoutSessionMetadataSchema = z.object({
  pendingPaymentTeamId: z.string().transform(Number),
  ownerId: z.string().transform(Number),
});

type CheckoutSessionMetadata = z.infer<typeof checkoutSessionMetadataSchema>;

export const schemaTeamReadPublic = Team.omit({});
export const schemaMembershipPublic = Membership.merge(z.object({ team: Team }).partial());

async function handler(request: NextRequest) {
  try {
    const { session_id } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    const checkoutSession = await getCheckoutSession(session_id);
    validateCheckoutSession(checkoutSession);
    const checkoutSessionSubscription = getCheckoutSessionSubscription(checkoutSession);
    const checkoutSessionMetadata = getCheckoutSessionMetadata(checkoutSession);

    const finalizedTeam = await prisma.team.update({
      where: { id: checkoutSessionMetadata.pendingPaymentTeamId },
      data: {
        pendingPayment: false,
        members: {
          create: {
            userId: checkoutSessionMetadata.ownerId as number,
            role: MembershipRole.OWNER,
            accepted: true,
          },
        },
        metadata: {
          paymentId: checkoutSession.id,
          subscriptionId: checkoutSessionSubscription.id || null,
          subscriptionItemId: checkoutSessionSubscription.items.data[0].id || null,
        },
      },
      include: { members: true },
    });

    const response = {
      message: `Team created successfully. We also made user with ID=${checkoutSessionMetadata.ownerId} the owner of this team.`,
      team: schemaTeamReadPublic.parse(finalizedTeam),
      owner: schemaMembershipPublic.parse(finalizedTeam.members[0]),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error creating team:", error);

    if (error instanceof HttpError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

async function getCheckoutSession(sessionId: string) {
  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (!checkoutSession) throw new HttpError({ statusCode: 404, message: "Checkout session not found" });

  return checkoutSession;
}

function validateCheckoutSession(checkoutSession: Stripe.Response<Stripe.Checkout.Session>) {
  if (checkoutSession.payment_status !== "paid")
    throw new HttpError({ statusCode: 402, message: "Payment required" });
}

function getCheckoutSessionSubscription(checkoutSession: Stripe.Response<Stripe.Checkout.Session>) {
  if (!checkoutSession.subscription) {
    throw new HttpError({
      statusCode: 400,
      message: "Can't publish team/org without subscription",
    });
  }

  return checkoutSession.subscription as Stripe.Subscription;
}

function getCheckoutSessionMetadata(
  checkoutSession: Stripe.Response<Stripe.Checkout.Session>
): CheckoutSessionMetadata {
  const parseCheckoutSessionMetadata = checkoutSessionMetadataSchema.safeParse(checkoutSession.metadata);

  if (!parseCheckoutSessionMetadata.success) {
    throw new HttpError({
      statusCode: 400,
      message: `Incorrect metadata in checkout session. Error: ${parseCheckoutSessionMetadata.error}`,
    });
  }

  return parseCheckoutSessionMetadata.data;
}

export const GET = defaultResponderForAppDir(handler);
