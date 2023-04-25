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

export async function handlePaymentSuccess(payload: z.infer<typeof MPPaymentSchema>) {
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: payload.external_reference,
    },
    select: {
      id: true,
      bookingId: true,
    },
  });
  if (!payment?.bookingId) {
    console.log(JSON.stringify(payload), JSON.stringify(payment));
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log("Webhook Received", req.method, req.body);
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const { body } = req;
    // We first receive a notification from Mercado Pago that a payment was made
    console.log("Webhook Received", body);
    if (MercadoPagoPayloadSchemaEvent.safeParse(body).success || !!body.action) {
      return res.status(200).end();
    }

    // The second notification is the actual payment
    const parse = MPPaymentSchema.safeParse(body);
    if (!parse.success) {
      throw new HttpCode({ statusCode: 400, message: "Bad Request1" });
    }
    const { data: parsedPayload } = parse;
    await handlePaymentSuccess(parsedPayload);
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }

  // Return a response to acknowledge receipt of the event
  res.status(200).end();
}

const MercadoPagoPayloadSchemaEvent = z.object({
  action: z.string(),
  api_version: z.string(),
  application_id: z.string(),
  date_created: z.string(),
  id: z.string(),
  live_mode: z.boolean(),
  type: z.string(),
  user_id: z.number(),
  data: z.object({
    id: z.string().optional(),
  }),
});

const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  picture_url: z.string(),
  category_id: z.string(),
  quantity: z.number(),
  currency_id: z.string(),
  unit_price: z.number(),
});

const payerSchema = z.object({
  email: z.string(),
  identification: z
    .object({
      type: z.string().optional(),
      number: z.string().optional(),
    })
    .optional(),
});

const paymentMethodSchema = z.object({
  installments: z.number(),
  payment_type_id: z.string(),
  issuer_id: z.string().optional(),
  excluded_payment_methods: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
  excluded_payment_types: z
    .array(
      z.object({
        id: z.string(),
      })
    )
    .optional(),
});

const shippingSchema = z.object({
  receiver_address: z
    .object({
      zip_code: z.string(),
      street_name: z.string(),
      street_number: z.string(),
      floor: z.string().optional(),
      apartment: z.string().optional(),
    })
    .optional(),
});

const redirectUrlsSchema = z.object({
  success: z.string(),
  pending: z.string().optional(),
  failure: z.string().optional(),
});

const backUrlsSchema = z.object({
  success: z.string().optional(),
  pending: z.string().optional(),
  failure: z.string().optional(),
});

const MPPaymentSchema = z.object({
  additional_info: z.string(),
  auto_return: z.string(),
  back_urls: backUrlsSchema,
  binary_mode: z.boolean(),
  client_id: z.string(),
  collector_id: z.number(),
  coupon_code: z.nullable(z.string()),
  coupon_labels: z.nullable(z.array(z.string())),
  date_created: z.string(),
  date_of_expiration: z.nullable(z.string()),
  expiration_date_from: z.nullable(z.string()),
  expiration_date_to: z.nullable(z.string()),
  expires: z.boolean(),
  external_reference: z.string(),
  id: z.string(),
  init_point: z.string(),
  internal_metadata: z.nullable(z.object({}).optional()),
  items: z.array(itemSchema),
  marketplace: z.string(),
  marketplace_fee: z.number(),
  metadata: z.record(z.unknown()),
  notification_url: z.nullable(z.string()),
  operation_type: z.string(),
  payer: payerSchema,
  payment_methods: paymentMethodSchema,
  processing_modes: z.nullable(z.array(z.string())),
  product_id: z.nullable(z.string()),
  redirect_urls: redirectUrlsSchema,
  sandbox_init_point: z.string(),
  site_id: z.string(),
  shipments: z.array(shippingSchema),
  total_amount: z.nullable(z.number()),
  last_updated: z.nullable(z.string()),
});
