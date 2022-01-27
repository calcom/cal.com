import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import stripe from "@ee/lib/stripe/server";

import { IS_PRODUCTION } from "@lib/config/constants";
import { HttpError as HttpCode } from "@lib/core/http/error";
import { getErrorFromUnknown } from "@lib/errors";
import EventManager from "@lib/events/EventManager";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import prisma from "@lib/prisma";

import { getTranslation } from "@server/lib/i18n";

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
          confirmed: true,
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
          destinationCalendar: true,
          user: {
            select: {
              id: true,
              credentials: true,
              timeZone: true,
              email: true,
              name: true,
              locale: true,
              destinationCalendar: true,
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

  const t = await getTranslation(user.locale ?? "en", "common");
  const attendeesListPromises = booking.attendees.map(async (attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  });

  const attendeesList = await Promise.all(attendeesListPromises);

  const evt: CalendarEvent = {
    type: booking.title,
    title: booking.title,
    description: booking.description || undefined,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: user.email!,
      name: user.name!,
      timeZone: user.timeZone,
      language: { translate: t, locale: user.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: booking.uid,
    destinationCalendar: booking.destinationCalendar || user.destinationCalendar,
  };

  if (booking.location) evt.location = booking.location;

  if (booking.confirmed) {
    const eventManager = new EventManager(user);
    const scheduleResult = await eventManager.create(evt);

    await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        references: {
          create: scheduleResult.referencesToCreate,
        },
      },
    });
  }

  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was paid and confirmed.`,
  });
}

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler | undefined> = {
  "payment_intent.succeeded": handlePaymentSuccess,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      throw new HttpCode({ statusCode: 400, message: "Missing stripe-signature" });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new HttpCode({ statusCode: 500, message: "Missing process.env.STRIPE_WEBHOOK_SECRET" });
    }
    const requestBuffer = await buffer(req);
    const payload = requestBuffer.toString();

    const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);

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
    res.status(err.statusCode ?? 500).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
}
