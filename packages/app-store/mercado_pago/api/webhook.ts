import { BookingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import * as z from "zod";

import EventManager from "@calcom/core/EventManager";
import { sendScheduledEmails } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { handleConfirmation } from "@calcom/features/bookings/lib/handleConfirmation";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
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
          credentials: true,
          timeZone: true,
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
      language: { translate: t, locale: user.locale ?? "en" },
      id: user.id,
    },
    attendees: attendeesList,
    uid: booking.uid,
    destinationCalendar: booking.destinationCalendar || user.destinationCalendar,
    recurringEvent: parseRecurringEvent(eventTypeRaw?.recurringEvent),
  };

  return {
    booking,
    user,
    evt,
    eventTypeRaw,
  };
}

async function handlePaymentSuccess(payload: z.infer<typeof MercadoPagoPayloadSchema>) {
  return true;
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

  const booking = await prisma.booking.findUnique({
    where: {
      id: payment.bookingId,
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
      responses: true,
      user: {
        select: {
          id: true,
          username: true,
          credentials: true,
          timeZone: true,
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

  const evt: CalendarEvent = {
    type: booking.title,
    title: booking.title,
    description: booking.description || undefined,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    ...getCalEventResponses({
      booking: booking,
      bookingFields: booking.eventType?.bookingFields || null,
    }),
    organizer: {
      email: user.email,
      name: user.name!,
      timeZone: user.timeZone,
      language: { translate: t, locale: user.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: booking.uid,
    destinationCalendar: booking.destinationCalendar || user.destinationCalendar,
    recurringEvent: parseRecurringEvent(eventTypeRaw?.recurringEvent),
  };

  if (booking.location) evt.location = booking.location;

  const bookingData: Prisma.BookingUpdateInput = {
    paid: true,
    status: BookingStatus.ACCEPTED,
  };

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  if (isConfirmed) {
    const eventManager = new EventManager(user);
    const scheduleResult = await eventManager.create(evt);
    bookingData.references = { create: scheduleResult.referencesToCreate };
  }

  if (eventTypeRaw?.requiresConfirmation) {
    delete bookingData.status;
  }

  const paymentUpdate = prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      success: true,
    },
  });

  const bookingUpdate = prisma.booking.update({
    where: {
      id: booking.id,
    },
    data: bookingData,
  });

  await prisma.$transaction([paymentUpdate, bookingUpdate]);

  if (!isConfirmed && !eventTypeRaw?.requiresConfirmation) {
    await handleConfirmation({ user, evt, prisma, bookingId: booking.id, booking, paid: true });
  } else {
    await sendScheduledEmails({ ...evt });
  }

  throw new HttpCode({
    statusCode: 200,
    message: `Booking with id '${booking.id}' was paid and confirmed.`,
  });
}

type WebhookHandler = (action: "test.created" | "created") => Promise<void>;

const webhookHandlers: Record<string, WebhookHandler | undefined> = {
  "test.created": handlePaymentSuccess,
  created: handlePaymentSuccess,
};

const MercadoPagoPayloadSchema = z.object({
  action: z.string(),
  api_version: z.string(),
  application_id: z.string(),
  date_created: z.string(),
  id: z.string(),
  live_mode: z.enum(["false", "true"]),
  type: z.literal("test"),
  user_id: z.string(),
  data: z.object({
    id: z.string(),
  }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const { body } = req;
    const parse = MercadoPagoPayloadSchema.safeParse(body);
    if (!parse.success) {
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }
    const { data: parsedPayload } = parse;
    const handler = webhookHandlers[parsedPayload.action];
    if (handler) {
      await handler(parsedPayload);
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
