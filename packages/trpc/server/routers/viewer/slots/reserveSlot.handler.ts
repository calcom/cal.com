import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuid } from "uuid";

import dayjs from "@calcom/dayjs";
import { MINUTES_TO_BOOK } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TReserveSlotInputSchema } from "./reserveSlot.schema";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload, { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { CalendarEvent } from "@calcom/types/Calendar";

interface ReserveSlotOptions {
  ctx: {
    prisma: PrismaClient;
    req?: NextApiRequest | undefined;
    res?: NextApiResponse | undefined;
  };
  input: TReserveSlotInputSchema;
}
export const reserveSlotHandler = async ({ ctx, input }: ReserveSlotOptions) => {
  const { prisma, req, res } = ctx;
  const uid = req?.cookies?.uid || uuid();
  const { slotUtcStartDate, slotUtcEndDate, eventTypeId, bookingAttendees } = input;
  const releaseAt = dayjs.utc().add(parseInt(MINUTES_TO_BOOK), "minutes").format();
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: {
      id: true,
      users: { select: { id: true } },
      userId: true,
      seatsPerTimeSlot: true,
      requiresConfirmation: true,
      title: true,
      eventName: true,
      currency: true,
      length: true,
      description: true,
      price: true,
    },
  });

  if (!eventType) {
    throw new TRPCError({
      message: "Event type not found",
      code: "NOT_FOUND",
    });
  }

  let shouldReserveSlot = true;

  // If this is a seated event then don't reserve a slot
  if (eventType.seatsPerTimeSlot) {
    // Check to see if this is the last attendee
    if (bookingAttendees) {
      const seatsLeft = eventType.seatsPerTimeSlot - bookingAttendees;
      if (seatsLeft < 1) shouldReserveSlot = false;
    } else {
      // If there is no booking yet then don't reserve the slot
      shouldReserveSlot = false;
    }
  }

  if (eventType && shouldReserveSlot) {
    try {
      await Promise.all(
        eventType.users.map((user) =>
          prisma.selectedSlots.upsert({
            where: { selectedSlotUnique: { userId: user.id, slotUtcStartDate, slotUtcEndDate, uid } },
            update: {
              slotUtcStartDate,
              slotUtcEndDate,
              releaseAt,
              eventTypeId,
            },
            create: {
              userId: user.id,
              eventTypeId,
              slotUtcStartDate,
              slotUtcEndDate,
              uid,
              releaseAt,
              isSeat: eventType.seatsPerTimeSlot !== null,
            },
          })
        )
      );
    } catch {
      throw new TRPCError({
        message: "Event type not found",
        code: "NOT_FOUND",
      });
    }
    // if the event needs confirmation we will send BOOKING REQUESTED Event
    if (eventType.requiresConfirmation) {
      const eventTypeInfo: EventTypeInfo = {
        eventTitle: eventType.title,
        eventDescription: eventType.description,
        requiresConfirmation: eventType.requiresConfirmation || null,
        price: eventType.price,
        currency: eventType.currency,
        length: eventType.length,
      };

      
      // figure out the organizer first
      
      let evt: CalendarEvent = {
        type: eventType.title,
        title: eventType.eventName ?? "Nameless", //this needs to be either forced in english, or fetched for each attendee and organizer separately
        description: eventType.description,
        startTime: dayjs(slotUtcStartDate).utc().format(),
        endTime: dayjs(slotUtcEndDate).utc().format(),
        organizer: {
          name: "Nameless", //organizerUser.name || "Nameless",
          email: "Email-less", //organizerUser.email || "Email-less",
          timeZone: "organizerUser.timeZone",
          language: { translate: {tOrganizer}, locale: organizerUser.locale ?? "en" },
          timeFormat: organizerUser.timeFormat === 24 ? TimeFormat.TWENTY_FOUR_HOUR : TimeFormat.TWELVE_HOUR,
        },
        attendees: attendeesList,
      };
      
      const subscribersBookingRequested = await getWebhooks({
        userId: "booking.userId" || 0,
        eventTypeId,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      });

      const promises = subscribersBookingRequested.map((sub) =>
        sendPayload(sub.secret, WebhookTriggerEvents.BOOKING_CREATED, new Date().toISOString(), sub, {
          ...evt,
          ...eventTypeInfo,
          eventTypeId,
          status: "ACCEPTED",
        }).catch((e) => {
          console.error(
            `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CREATED}, URL: ${sub.subscriberUrl}`,
            e
          );
        })
      );
      await Promise.all(promises)
    }
  }
  res?.setHeader("Set-Cookie", serialize("uid", uid, { path: "/", sameSite: "lax" }));
  return;
};
