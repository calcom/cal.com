import { HttpError } from "@/../../packages/lib/http-error";
import { WebhookTriggerEvents } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { BookingResponse, BookingsResponse } from "@calcom/api/lib/types";
import sendPayload from "@calcom/api/lib/utils/sendPayload";
import getWebhooks from "@calcom/api/lib/utils/webhookSubscriptions";
import { schemaBookingCreateBodyParams, schemaBookingReadPublic } from "@calcom/api/lib/validations/booking";
import { schemaEventTypeReadPublic } from "@calcom/api/lib/validations/event-type";
import { defaultResponder } from "@calcom/lib/server";

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Creates a new booking
 *     operationId: addBooking
 *     requestBody:
 *       description: Edit an existing booking related to one of your event-types
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: 15min
 *               startTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *               endTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *              recurringCount:
 *                 type: number
 *                 example: 8
 *     tags:
 *     - bookings
 *     responses:
 *       201:
 *         description: Booking(s) created successfully.
 *       400:
 *        description: |
 *          Message | Cause
 *          :--|:--
 *          Booking body is invalid| Missing property on booking entity.
 *          Invalid eventTypeId| The provided eventTypeId does not exist.
 *          Missing recurringCount| The eventType is recurring, and no recurringCount was passed.
 *          Invalid recurringCount| The provided recurringCount is greater than the eventType recurring config
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function handler(
  { body, userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<BookingsResponse | BookingResponse>
) {
  const booking = schemaBookingCreateBodyParams.parse(body);
  if (!isAdmin) {
    booking.userId = userId;
  }
  const eventTypeDb = await prisma.eventType.findUnique({
    where: { id: booking.eventTypeId },
  });
  if (!eventTypeDb) throw new HttpError({ statusCode: 400, message: "Invalid eventTypeId." });
  const eventType = schemaEventTypeReadPublic.parse(eventTypeDb);
  let bookings: z.infer<typeof schemaBookingReadPublic>[];
  if (!eventType) throw new HttpError({ statusCode: 400, message: "Could not create new booking" });
  if (eventType.recurringEvent) {
    console.log("Event type has recurring configuration");
    if (!booking.recurringCount) throw new HttpError({ statusCode: 400, message: "Missing recurringCount." });
    if (eventType.recurringEvent.count && booking.recurringCount > eventType?.recurringEvent.count) {
      throw new HttpError({ statusCode: 400, message: "Invalid recurringCount." });
    }
    // Event type is recurring, ceating each booking
    const recurringEventId = uuidv4();
    const allBookings = await Promise.all(
      Array.from(Array(booking.recurringCount).keys()).map(async () => {
        return await prisma.booking.create({
          data: {
            uid: uuidv4(),
            recurringEventId,
            eventTypeId: booking.eventTypeId,
            title: booking.title,
            startTime: booking.startTime,
            endTime: booking.endTime,
            userId: booking.userId,
          },
        });
      })
    );
    bookings = allBookings.map((book) => schemaBookingReadPublic.parse(book));
  } else {
    // Event type not recurring, ceating as single one
    const data = await prisma.booking.create({
      data: {
        uid: uuidv4(),
        eventTypeId: booking.eventTypeId,
        title: booking.title,
        startTime: booking.startTime,
        endTime: booking.endTime,
        userId: booking.userId,
      },
    });
    bookings = [schemaBookingReadPublic.parse(data)];
  }

  await Promise.all(
    bookings.map(async (booking) => {
      const evt = {
        type: eventType?.title || booking.title,
        title: booking.title,
        description: "",
        additionalNotes: "",
        customInputs: {},
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        organizer: {
          name: "",
          email: "",
          timeZone: "",
          language: {
            locale: "en",
          },
        },
        attendees: [],
        location: "",
        destinationCalendar: null,
        hideCalendar: false,
        uid: booking.uid,
        metadata: {},
      };
      console.log(`evt: ${evt}`);

      // Send Webhook call if hooked to BOOKING_CREATED
      const triggerEvent = WebhookTriggerEvents.BOOKING_CREATED;
      console.log(`Trigger Event: ${triggerEvent}`);
      const subscriberOptions = {
        userId,
        eventTypeId: booking.eventTypeId as number,
        triggerEvent,
      };
      console.log(`subscriberOptions: ${subscriberOptions}`);

      const subscribers = await getWebhooks(subscriberOptions, prisma);
      console.log(`subscribers: ${subscribers}`);
      const bookingId = booking?.id;
      await Promise.all(
        subscribers.map((sub) =>
          sendPayload(triggerEvent, new Date().toISOString(), sub, {
            ...evt,
            bookingId,
          })
        )
      );
      console.log("All promises resolved! About to send the response");
    })
  );

  if (bookings.length > 1) {
    res.status(201).json({ bookings, message: "Bookings created successfully." });
  } else {
    res.status(201).json({ booking: bookings[0], message: "Booking created successfully." });
  }
}

export default defaultResponder(handler);
