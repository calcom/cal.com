import type { Prisma } from "@prisma/client";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";

import stripe from "@calcom/app-store/stripepayment/lib/server";
import EventManager from "@calcom/core/EventManager";
import dayjs from "@calcom/dayjs";
import { sendOrganizerRequestEmail, sendAttendeeRequestEmail } from "@calcom/emails";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import { bookingMinimalSelect, prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
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

async function handleStripePaymentSuccess(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: paymentIntent.id,
    },
    select: {
      id: true,
      bookingId: true,
    },
  });
  if (!payment?.bookingId) {
    console.log(JSON.stringify(paymentIntent), JSON.stringify(payment));
  }
  if (!payment?.bookingId) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

  await handlePaymentSuccess(payment.id, payment.bookingId);
}

const handleSetupSuccess = async (event: Stripe.Event) => {
  const setupIntent = event.data.object as Stripe.SetupIntent;
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: setupIntent.id,
    },
  });

  if (!payment?.data || !payment?.id) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

  const { booking, user, evt, eventType } = await getBooking(payment.bookingId);

  const bookingData: Prisma.BookingUpdateInput = {
    paid: true,
  };

  const userWithCredentials = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      username: true,
      timeZone: true,
      email: true,
      name: true,
      locale: true,
      destinationCalendar: true,
      credentials: { select: credentialForCalendarServiceSelect },
    },
  });

  if (!userWithCredentials) throw new HttpCode({ statusCode: 204, message: "No user found" });

  let requiresConfirmation = eventType?.requiresConfirmation;
  const rcThreshold = eventType?.metadata?.requiresConfirmationThreshold;
  if (rcThreshold) {
    if (dayjs(dayjs(booking.startTime).utc().format()).diff(dayjs(), rcThreshold.unit) > rcThreshold.time) {
      requiresConfirmation = false;
    }
  }

  if (!requiresConfirmation) {
    const eventManager = new EventManager(userWithCredentials);
    const scheduleResult = await eventManager.create(evt);
    bookingData.references = { create: scheduleResult.referencesToCreate };
    bookingData.status = BookingStatus.ACCEPTED;
  }

  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      data: {
        ...(payment.data as Prisma.JsonObject),
        setupIntent: setupIntent as unknown as Prisma.JsonObject,
      },
      booking: {
        update: {
          ...bookingData,
        },
      },
    },
  });

  // If the card information was already captured in the same customer. Delete the previous payment method

  if (!requiresConfirmation) {
    await handleConfirmation({
      user: userWithCredentials,
      evt,
      prisma,
      bookingId: booking.id,
      booking,
      paid: true,
    });
  } else {
    await sendOrganizerRequestEmail({ ...evt });
    await sendAttendeeRequestEmail({ ...evt }, evt.attendees[0]);
  }
};

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler | undefined> = {
  "payment_intent.succeeded": handleStripePaymentSuccess,
  "setup_intent.succeeded": handleSetupSuccess,
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
    if (!event.account && !process.env.NEXT_PUBLIC_IS_E2E) {
      throw new HttpCode({ statusCode: 202, message: "Incoming connected account" });
    }

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
