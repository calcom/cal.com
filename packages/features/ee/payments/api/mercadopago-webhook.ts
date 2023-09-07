import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import * as z from "zod";

import MercadoPago from "@calcom/app-store/mercadopago/lib/MercadoPago";
import { getMercadoPagoAppKeys } from "@calcom/app-store/mercadopago/lib/getMercadoPagoAppKeys";
import type { MercadoPagoUserCredentialSchema } from "@calcom/app-store/mercadopago/lib/mercadoPagoCredentialSchema";
import { mercadoPagoCredentialSchema } from "@calcom/app-store/mercadopago/lib/mercadoPagoCredentialSchema";
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

export async function handlePaymentSuccess(payload: z.infer<typeof extendedEventSchema>) {
  // We have the payment ID
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: payload.external_reference,
    },
    select: {
      id: true,
      bookingId: true,
      success: true,
    },
  });

  if (!payment?.bookingId) throw new HttpCode({ statusCode: 204, message: "No payment found" });

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
  if (!booking.userId) throw new HttpCode({ statusCode: 204, message: "No user found" });

  const userCredentials = await findPaymentCredentials(booking.userId);
  if (!userCredentials) throw new HttpCode({ statusCode: 204, message: "No credentials found" });

  const { client_id, client_secret } = await getMercadoPagoAppKeys();

  const mercadoPago = new MercadoPago({ clientId: client_id, clientSecret: client_secret, userCredentials });
  const mercadoPagoPayment = await mercadoPago.getPayment(payload.data.id);

  if (mercadoPagoPayment.status !== "approved") {
    throw new HttpCode({
      statusCode: 200,
      message: `Booking with id '${booking.id}' was not paid.`,
    });
  }

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
    destinationCalendar: booking.destinationCalendar
      ? [booking.destinationCalendar]
      : user.destinationCalendar
      ? [user.destinationCalendar]
      : [],
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

  if (!payment?.success) {
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        success: true,
      },
    });
  }

  if (booking.status === "PENDING") {
    await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: bookingData,
    });
  }

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

    const bodyRaw = await getRawBody(req);
    const bodyAsString = bodyRaw.toString();

    const parse = extendedEventSchema.safeParse(JSON.parse(bodyAsString));
    if (!parse.success) {
      console.error(parse.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { data: parsedPayload } = parse;

    if (parsedPayload.type === "payment" && parsedPayload.action === "payment.created") {
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

const eventSchema = z.object({
  id: z.number(),
  live_mode: z.boolean(),
  type: z.enum(["payment"]),
  date_created: z.string().datetime(),
  user_id: z.number(),
  api_version: z.string(),
  action: z.enum(["payment.created", "payment.updated"]),
  data: z.object({
    id: z.preprocess(String, z.string()),
  }),
});

const extendedEventSchema = eventSchema.extend({
  // Added when set the `notification_url` in `PaymentService`.
  external_reference: z.string().uuid(),
});

export const findPaymentCredentials = async (
  userId: number
): Promise<MercadoPagoUserCredentialSchema | null> => {
  try {
    const credentials = await prisma.credential.findFirst({
      where: {
        appId: "mercadopago",
        userId,
      },
      select: {
        id: true,
        key: true,
      },
    });

    if (!credentials) {
      throw new Error("No credentials found");
    }

    const parsedCredentials = mercadoPagoCredentialSchema.safeParse(credentials?.key);
    if (!parsedCredentials.success) {
      throw new Error("Credentials malformed");
    }

    return {
      id: credentials.id,
      key: parsedCredentials.data,
    };
  } catch (error) {
    console.error("Error finding MercadoPago payment credentials:", error);
    return null;
  }
};
