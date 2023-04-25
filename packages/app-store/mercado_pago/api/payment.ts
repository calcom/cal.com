import { BookingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import * as MercadoPago from "mercadopago";
import type { NextApiRequest, NextApiResponse } from "next";
import * as z from "zod";

import { mercadoPagoCredentialKeysSchema } from "@calcom/app-store/mercado_pago/lib/PaymentService";
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

export async function handlePaymentSuccess(payload: z.infer<typeof paymentSchema>) {
  const payment = await prisma.payment.findFirst({
    where: {
      uid: payload.external_reference,
    },
    select: {
      id: true,
      bookingId: true,
      success: true,
    },
  });

  if (!payment?.bookingId) {
    return {
      success: false,
      message: "No payment found",
    };
  }

  if (payment.success) {
    return {
      success: true,
      message: "Payment already processed",
    };
  }

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
          timeZone: true,
          email: true,
          name: true,
          locale: true,
          destinationCalendar: true,
          credentials: true,
        },
      },
    },
  });

  if (!booking) {
    return {
      success: false,
      message: "No booking found",
    };
  }

  type EventTypeRaw = Awaited<ReturnType<typeof getEventType>>;
  let eventTypeRaw: EventTypeRaw | null = null;
  if (booking.eventTypeId) {
    eventTypeRaw = await getEventType(booking.eventTypeId);
  }

  const { user } = booking;

  if (!user) {
    return {
      success: false,
      message: "No user found",
    };
  }

  // Load MP app credentials from user
  const mpCredential = user.credentials.find((cred) => cred.appId === "mercado_pago");

  if (!mpCredential) {
    return {
      success: false,
      message: "No Mercado Pago credentials found",
    };
  } else {
    const safeParseKey = mercadoPagoCredentialKeysSchema.safeParse(mpCredential.key);
    if (!safeParseKey.success) {
      return {
        success: false,
        message: "Invalid Mercado Pago credentials",
      };
    }
    // Validate payment using MercadoPago API
    MercadoPago.configure({
      access_token: safeParseKey.data.access_token,
    });
    const paymentInfo = await MercadoPago.payment.get(payload.payment_id);

    const safeParsePaymentId = getPaymentIdSchema.safeParse(paymentInfo.body);

    if (
      !safeParsePaymentId.success ||
      (safeParsePaymentId.success && safeParsePaymentId.data.status !== "approved")
    ) {
      return {
        success: false,
        message: "Payment not approved",
      };
    }
  }

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

  return {
    success: true,
    message: "Payment success",
    data: {
      bookingUid: booking.uid,
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const { query } = req;
    const parse = paymentSchema.safeParse(query);
    if (!parse.success) {
      console.error("Error while parsing query: ", parse.error);
      throw new HttpCode({ statusCode: 200, message: "Bad Request" });
    }
    const { data: parsedPayload } = parse;
    const result = await handlePaymentSuccess(parsedPayload);
    if (!result.success) {
      throw new HttpCode({ statusCode: 200, message: result.message });
    }
    return res.redirect(`/booking/${result.data?.bookingUid}`);
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Payment Error: ${err.message}`);
    res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }
}

const paymentSchema = z.object({
  redirect_status: z.enum(["success", "pending", "failure"]),
  collection_id: z.string(),
  collection_status: z.string(),
  payment_id: z.coerce.number(),
  status: z.string(),
  external_reference: z.string(),
  payment_type: z.string(),
  merchant_order_id: z.string(),
  preference_id: z.string(),
  site_id: z.string(),
  processing_mode: z.string(),
  merchant_account_id: z.string().nullable(),
});

const payerSchema = z.object({});

const transactionDetailsSchema = z.object({});

const getPaymentIdSchema = z
  .object({
    id: z.number(),
    date_created: z.string(),
    date_approved: z.string(),
    date_last_updated: z.string(),
    money_release_date: z.string(),
    payment_method_id: z.string(),
    payment_type_id: z.string(),
    status: z.string(),
    status_detail: z.string(),
    currency_id: z.string(),
    description: z.string(),
    collector_id: z.number(),
    payer: payerSchema,
    metadata: z.object({}).optional(),
    additional_info: z.object({}).optional(),
    transaction_amount: z.number(),
    transaction_amount_refunded: z.number(),
    coupon_amount: z.number(),
    transaction_details: transactionDetailsSchema,
    installments: z.number(),
    card: z.object({}).optional(),
  })
  .passthrough();
