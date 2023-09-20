import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { prisma, bookingMinimalSelect } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getEventType(id: number) {
  return prisma.eventType.findUnique({
    where: {
      id,
    },
    select: {
      recurringEvent: true,
      requiresConfirmation: true,
      metadata: true,
    },
  });
}

async function getBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      ...bookingMinimalSelect,
      eventType: true,
      smsReminderNumber: true,
      location: true,
      eventTypeId: true,
      userId: true,
      uid: true,
      paid: true,
      destinationCalendar: true,
      status: true,
      user: {
        select: {
          id: true,
          username: true,
          timeZone: true,
          timeFormat: true,
          email: true,
          name: true,
          locale: true,
          destinationCalendar: true,
        },
      },
    },
  });

  if (!booking) throw new HttpCode({ statusCode: 204, message: "No booking found" });

  type EventTypeRaw = Awaited<ReturnType<typeof getEventType>>;
  let eventTypeRaw: EventTypeRaw | null = null;
  if (booking.eventTypeId) {
    eventTypeRaw = await getEventType(booking.eventTypeId);
  }

  const eventType = { ...eventTypeRaw, metadata: EventTypeMetaDataSchema.parse(eventTypeRaw?.metadata) };

  const { user } = booking;

  if (!user) throw new HttpCode({ statusCode: 204, message: "No user found" });

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
  const selectedDestinationCalendar = booking.destinationCalendar || user.destinationCalendar;
  const evt: CalendarEvent = {
    type: booking.title,
    title: booking.title,
    description: booking.description || undefined,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    organizer: {
      email: user.email,
      name: user.name!,
      timeZone: user.timeZone,
      timeFormat: getTimeFormatStringFromUserTimeFormat(user.timeFormat),
      language: { translate: t, locale: user.locale ?? "en" },
      id: user.id,
    },
    attendees: attendeesList,
    uid: booking.uid,
    destinationCalendar: selectedDestinationCalendar ? [selectedDestinationCalendar] : [],
    recurringEvent: parseRecurringEvent(eventType?.recurringEvent),
  };

  return {
    booking,
    user,
    evt,
    eventType,
  };
}

async function handlePaymentSuccess(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const payment = await prisma.payments.findFirst({
    where: {
      externalId: paymentIntent.id,
    },
    select: {
      id: true,
      eventId: true,
    },
  });
  if (!payment?.eventId) {
  }
  if (!payment?.eventId) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

  const booking = await prisma.eventType.findUnique({
    where: {
      id: payment.eventId,
    },
  });

  if (!booking) throw new HttpCode({ statusCode: 204, message: "No booking found" });
  const paymentUpdate = prisma.payments.update({
    where: {
      id: payment.id,
    },
    data: {
      success: true,
    },
  });
  const bookingUpdate = prisma.eventType.update({
    where: {
      id: booking.id,
    },
    data: {
      paid: true,
      slug: paymentIntent.metadata.secret,
    },
  });

  await prisma.$transaction([paymentUpdate, bookingUpdate]);
  //   await sendScheduledEmails({ ...evt });
  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was paid and confirmed.`,
  });
}
async function handleCheckout(event: Stripe.Event) {
  const payload = event.data.object as Stripe.Checkout.Session;

  try {
    if (payload) {
      payload.amount_subtotal /= 100;
      payload.amount_total /= 100;
      payload.total_details.amount_discount /= 100;
      const updatedRecord = await prisma.payments.update({
        where: {
          externalId: payload.payment_intent as string,
        },
        data: {
          data: payload,
        },

        select: {
          id: true,
          uid: true,
          currency: true,
          amount: true,
          success: true,
          eventId: true,
          externalId: true,
          data: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              locations: true,
              length: true,
              hidden: true,
              users: {
                select: {
                  id: true,
                  timeZone: true,
                  name: true,
                  email: true,
                },
              },
              disableGuests: true,
              paid: true,
              joined: true,
              minimumBookingNotice: true,
            },
          },
          // Add other fields you want to select from the Payments model
        },
      });

      if (!updatedRecord || !updatedRecord.success) {
        // Log the error with additional details
        throw new HttpCode({ statusCode: 204, message: "Payment not found" });
      }

      const eventTrigger: WebhookTriggerEvents = "SESSION_CREATED";
      // Send Webhook call if hooked to BOOKING.RECORDING_READY
      const subscriberOptions = {
        triggerEvent: eventTrigger,
      };
      await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData: updatedRecord });

      throw new HttpCode({
        statusCode: 200,
        message: `Checkout Details updated`,
      });
    } else {
      throw new HttpCode({ statusCode: 204, message: "Payment not found" });
    }
  } catch (error) {
    console.error("Error updating payment:", error);
  }
}

async function handlePaymentFailure(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const payment = await prisma.payments.findFirst({
    where: {
      externalId: paymentIntent.id,
    },
    select: {
      id: true,
      eventId: true,
    },
  });

  if (!payment?.eventId) {
  }
  if (!payment?.eventId) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

  const booking = await prisma.eventType.findUnique({
    where: {
      id: payment.eventId,
    },
  });

  if (!booking) throw new HttpCode({ statusCode: 204, message: "No booking found" });

  await prisma.eventType.delete({
    where: {
      id: booking.id,
    },
  });
  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was deleted.`,
  });
}

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler | undefined> = {
  "payment_intent.succeeded": handlePaymentSuccess,
  "payment_intent.canceled": handlePaymentFailure,
  "checkout.session.completed": handleCheckout,
};

/**
 * @deprecated
 * We need to create a PaymentManager in `@calcom/core`
 * to prevent circular dependencies on App Store migration
 */
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

    // bypassing this validation for e2e tests
    // in order to successfully confirm the payment
    // if (!process.env.NEXT_PUBLIC_IS_E2E) {
    //   throw new HttpCode({ statusCode: 202, message: "Incoming connected account" });
    // }

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
