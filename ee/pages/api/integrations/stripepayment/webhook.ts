import type { NextApiRequest, NextApiResponse } from "next";
import { getErrorFromUnknown } from "pages/_error";
import Stripe from "stripe";

import stripe from "@ee/lib/stripe/server";

import { CalendarEvent } from "@lib/calendarClient";
import { HttpError } from "@lib/core/http/error";
import EventManager from "@lib/events/EventManager";
import prisma from "@lib/prisma";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePaymentSuccess(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const payment = await prisma.payment.update({
    where: {
      externalId: paymentIntent.id,
    },
    data: {
      success: true,
      booking: {
        update: {
          paid: true,
        },
      },
    },
    select: {
      bookingId: true,
      booking: {
        select: {
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          confirmed: true,
          attendees: true,
          location: true,
          userId: true,
          id: true,
          uid: true,
          paid: true,
          user: {
            select: {
              id: true,
              credentials: true,
              timeZone: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!payment) throw new Error("No payment found");

  const { booking } = payment;

  if (!booking) throw new Error("No booking found");

  const { user } = booking;

  if (!user) throw new Error("No user found");

  const evt: CalendarEvent = {
    type: booking.title,
    title: booking.title,
    description: booking.description || undefined,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: { email: user.email!, name: user.name!, timeZone: user.timeZone },
    attendees: booking.attendees,
  };
  if (booking.location) evt.location = booking.location;

  if (booking.confirmed) {
    const eventManager = new EventManager(user.credentials);
    const scheduleResult = await eventManager.create(evt, booking.uid);

    await prisma.booking.update({
      where: {
        id: payment.bookingId,
      },
      data: {
        references: {
          create: scheduleResult.referencesToCreate,
        },
      },
    });
  }
}

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler | undefined> = {
  "payment_intent.succeeded": handlePaymentSuccess,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    res.status(400).send(`Webhook Error: missing Stripe signature`);
    return;
  }

  if (!webhookSecret) {
    res.status(400).send(`Webhook Error: missing Stripe webhookSecret`);
    return;
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    const handler = webhookHandlers[event.type];
    if (!handler) {
      throw new HttpError({
        statusCode: 400,
        message: `Unhandled event type ${event.type}`,
      });
    }
    await handler(event);
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    res.status(err.statusCode ?? 500).send({
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
    return;
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
}
