import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { HttpError } from "@calcom/lib/http-error";
import { CreationSource } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";
import { z } from "zod";

const publicBookingRequestSchema = z.object({
  email: z.string().email(),
  eventId: z.number().int().positive(),
  timeSlot: z.object({
    start: z.string().datetime(),
    end: z.string().datetime().optional(),
    timeZone: z.string().default("UTC"),
  }),
});

const toDisplayNameFromEmail = (email: string) => {
  const [localPart = "Guest"] = email.split("@");
  const normalized = localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");

  return normalized || "Guest";
};

async function handler(req: NextApiRequest) {
  if (req.method !== "POST") {
    throw new HttpError({ statusCode: 405, message: "Method not allowed" });
  }

  const parsedRequest = publicBookingRequestSchema.safeParse(req.body);
  if (!parsedRequest.success) {
    throw new HttpError({
      statusCode: 400,
      message: "Invalid request body. Required fields: email, eventId, timeSlot.start",
    });
  }

  const userIp = getIP(req);
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `publicCreateBooking:${piiHasher.hash(userIp)}`,
  });

  const {
    email,
    eventId,
    timeSlot: { start, end, timeZone },
  } = parsedRequest.data;

  const regularBookingService = getRegularBookingService();
  const booking = await regularBookingService.createBooking({
    bookingData: {
      eventTypeId: eventId,
      start,
      end,
      timeZone,
      language: "en",
      metadata: {},
      hasHashedBookingLink: false,
      creationSource: CreationSource.API_V2,
      responses: {
        name: toDisplayNameFromEmail(email),
        email,
        location: {
          value: "conferencing",
          optionValue: "",
        },
      },
    },
    bookingMeta: {
      userId: -1,
      hostname: req.headers.host || "",
      forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
    },
  });

  return {
    bookingId: booking.id,
    bookingUid: booking.uid,
    status: booking.status,
    eventTypeId: booking.eventTypeId,
    startTime: booking.startTime,
    endTime: booking.endTime,
    attendeeEmail: email,
    attendeeName: toDisplayNameFromEmail(email),
    paymentRequired: booking.paymentRequired ?? false,
    paymentUid: booking.paymentUid ?? null,
    seatReferenceUid: booking.seatReferenceUid ?? null,
    videoCallUrl: booking.videoCallUrl ?? null,
  };
}

export default defaultResponder(handler, "/api/public/book");
