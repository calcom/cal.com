import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

const handleSubscriptionUpdate = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  if (!subscription.id) throw new HttpCode({ statusCode: 400, message: "Subscription ID not found" });

  const app = await prisma.credential.findFirst({
    where: {
      subscriptionId: subscription.id,
    },
  });

  if (!app) {
    throw new HttpCode({ statusCode: 202, message: "Received and discarded" });
  }

  await prisma.credential.update({
    where: {
      id: app.id,
    },
    data: {
      paymentStatus: subscription.status,
    },
  });
};

const handleSubscriptionDeleted = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  if (!subscription.id) throw new HttpCode({ statusCode: 400, message: "Subscription ID not found" });

  const app = await prisma.credential.findFirst({
    where: {
      subscriptionId: subscription.id,
    },
  });

  if (!app) {
    throw new HttpCode({ statusCode: 202, message: "Received and discarded" });
  }

  // should we delete the credential here rather than marking as inactive?
  await prisma.credential.update({
    where: {
      id: app.id,
    },
    data: {
      paymentStatus: "inactive",
      billingCycleStart: null,
    },
  });
};

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler | undefined> = {
  "customer.subscription.updated": handleSubscriptionUpdate,
  "customer.subscription.deleted": handleSubscriptionDeleted,
};

async function handler(req: NextRequest) {
  try {
    const sig = headers().get("stripe-signature");
    if (!sig) {
      throw new HttpCode({ statusCode: 400, message: "Missing stripe-signature" });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET_APPS) {
      throw new HttpCode({ statusCode: 500, message: "Missing process.env.STRIPE_WEBHOOK_SECRET_APPS" });
    }
    const rawBody = await req.text();
    const requestBuffer = Buffer.from(rawBody);
    const payload = requestBuffer.toString();

    const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET_APPS);

    const handler = webhookHandlers[event.type];
    if (handler) {
      await handler(event);
    } else {
      /** Not really an error, just letting Stripe know that the webhook was received but unhandled */
      throw new HttpCode({
        statusCode: 202,
        message: `Unhandled Stripe Webhook event type ${event.type}`,
      });
    }
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      {
        message: err.message,
        stack: IS_PRODUCTION ? undefined : err.stack,
      },
      {
        status: err.statusCode ?? 500,
      }
    );
    return;
  }

  // Return a response to acknowledge receipt of the event
  return NextResponse.json(
    {
      received: true,
    },
    {
      status: 200,
    }
  );
}

export const POST = handler;
