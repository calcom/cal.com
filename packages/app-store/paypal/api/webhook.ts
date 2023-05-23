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
import { BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

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

export async function handlePaymentSuccess(payload: z.infer<typeof PaypalPayloadSchema>) {
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: payload.resource.supplementary_data.related_ids.order_id,
    },
    select: {
      id: true,
      bookingId: true,
    },
  });

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
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const { body } = req;

    const parse = PaypalPayloadSchema.safeParse(body);
    if (!parse.success) {
      console.error(parse.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { data: parsedPayload } = parse;
    if (parsedPayload.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      return await handlePaymentSuccess(parsedPayload);
    }
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

const PaypalPayloadSchema = z.object({
  id: z.string(),
  create_time: z.string(),
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string(),
  resource: z.object({
    disbursement_mode: z.string().optional(),
    amount: z.object({
      currency_code: z.string(),
      value: z.string(),
    }),
    seller_protection: z.object({
      status: z.string().optional(),
      dispute_categories: z.array(z.string()).optional(),
    }),
    supplementary_data: z.object({
      related_ids: z.object({
        order_id: z.string(),
      }),
    }),
    update_time: z.string(),
    create_time: z.string(),
    final_capture: z.boolean(),
    seller_receivable_breakdown: z.object({
      gross_amount: z.object({
        currency_code: z.string(),
        value: z.string(),
      }),
      paypal_fee: z.object({
        currency_code: z.string(),
        value: z.string(),
      }),
      platform_fees: z.array(
        z.object({
          amount: z.object({
            currency_code: z.string(),
            value: z.string(),
          }),
          payee: z.object({
            merchant_id: z.string(),
          }),
        })
      ),
      net_amount: z.object({
        currency_code: z.string(),
        value: z.string(),
      }),
    }),
    invoice_id: z.string(),
    links: z.array(
      z.object({
        href: z.string(),
        rel: z.string(),
        method: z.string(),
      })
    ),
    id: z.string(),
    status: z.string(),
  }),
  links: z.array(
    z.object({
      href: z.string(),
      rel: z.string(),
      method: z.string(),
      encType: z.string().optional(),
    })
  ),
  event_version: z.string(),
  resource_version: z.string(),
});
