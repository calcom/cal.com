import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import * as z from "zod";

import { paypalCredentialKeysSchema } from "@calcom/app-store/paypal/lib";
import Paypal from "@calcom/app-store/paypal/lib/Paypal";
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

export async function handlePaymentSuccess(
  payload: z.infer<typeof eventSchema>,
  rawPayload: string,
  webhookHeaders: WebHookHeadersType
) {
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: payload?.resource?.id,
    },
    select: {
      id: true,
      bookingId: true,
      success: true,
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
  // Probably booking it's already paid from /capture but we need to send confirmation email
  const foundCredentials = await findPaymentCredentials(booking.id);
  if (!foundCredentials) throw new HttpCode({ statusCode: 204, message: "No credentials found" });
  const { webhookId, ...credentials } = foundCredentials;

  const paypalClient = new Paypal(credentials);
  await paypalClient.getAccessToken();
  await paypalClient.verifyWebhook({
    body: {
      auth_algo: webhookHeaders["paypal-auth-algo"],
      cert_url: webhookHeaders["paypal-cert-url"],
      transmission_id: webhookHeaders["paypal-transmission-id"],
      transmission_sig: webhookHeaders["paypal-transmission-sig"],
      transmission_time: webhookHeaders["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: rawPayload,
    },
  });

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
    const headers = req.headers;
    const bodyAsString = bodyRaw.toString();

    const parseHeaders = webhookHeadersSchema.safeParse(headers);
    if (!parseHeaders.success) {
      console.error(parseHeaders.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }
    const parse = eventSchema.safeParse(JSON.parse(bodyAsString));
    if (!parse.success) {
      console.error(parse.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { data: parsedPayload } = parse;

    if (parsedPayload.event_type === "CHECKOUT.ORDER.APPROVED") {
      return await handlePaymentSuccess(parsedPayload, bodyAsString, parseHeaders.data);
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

const resourceSchema = z
  .object({
    create_time: z.string(),
    id: z.string(),
    payment_source: z.object({
      paypal: z.object({}).optional(),
    }),
    intent: z.string(),
    payer: z.object({
      email_address: z.string(),
      payer_id: z.string(),
      address: z.object({
        country_code: z.string(),
      }),
    }),
    status: z.string().optional(),
  })
  .passthrough();

const eventSchema = z
  .object({
    id: z.string(),
    create_time: z.string(),
    resource_type: z.string(),
    event_type: z.string(),
    summary: z.string(),
    resource: resourceSchema,
    status: z.string().optional(),
    event_version: z.string(),
    resource_version: z.string(),
  })
  .passthrough();

const webhookHeadersSchema = z
  .object({
    "paypal-auth-algo": z.string(),
    "paypal-cert-url": z.string(),
    "paypal-transmission-id": z.string(),
    "paypal-transmission-sig": z.string(),
    "paypal-transmission-time": z.string(),
  })
  .passthrough();

type WebHookHeadersType = z.infer<typeof webhookHeadersSchema>;

export const findPaymentCredentials = async (
  bookingId: number
): Promise<{ clientId: string; secretKey: string; webhookId: string }> => {
  try {
    // @TODO: what about team bookings with paypal?
    const userFromBooking = await prisma?.booking.findFirst({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!userFromBooking) throw new Error("No user found");

    const credentials = await prisma?.credential.findFirst({
      where: {
        appId: "paypal",
        userId: userFromBooking?.userId,
      },
      select: {
        key: true,
      },
    });
    if (!credentials) {
      throw new Error("No credentials found");
    }
    const parsedCredentials = paypalCredentialKeysSchema.safeParse(credentials?.key);
    if (!parsedCredentials.success) {
      throw new Error("Credentials malformed");
    }

    return {
      clientId: parsedCredentials.data.client_id,
      secretKey: parsedCredentials.data.secret_key,
      webhookId: parsedCredentials.data.webhook_id,
    };
  } catch (err) {
    console.error(err);
    return {
      clientId: "",
      secretKey: "",
      webhookId: "",
    };
  }
};
