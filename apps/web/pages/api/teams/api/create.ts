import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { z } from "zod";

import stripe from "@calcom/features/ee/payments/server/stripe";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const checkoutSession = await getCheckoutSession(req);
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

  const response = JSON.stringify(
    {
      message: `Team created successfully. We also made user with ID=${checkoutSessionMetadata.ownerId} the owner of this team.`,
      team: schemaTeamReadPublic.parse(finalizedTeam),
      owner: schemaMembershipPublic.parse(finalizedTeam.members[0]),
    },
    null,
    2
  );

  return res.status(200).send(response);
}

async function getCheckoutSession(req: NextApiRequest) {
  const { session_id } = querySchema.parse(req.query);

  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
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

  const checkoutSessionMetadata = parseCheckoutSessionMetadata.data;

  return checkoutSessionMetadata;
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
