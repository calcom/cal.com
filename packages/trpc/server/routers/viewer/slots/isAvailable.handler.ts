import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { PrismaSelectedSlotRepository } from "@calcom/features/selectedSlots/repositories/PrismaSelectedSlotRepository";
import { HttpError } from "@calcom/lib/http-error";
import { getPastTimeAndMinimumBookingNoticeBoundsStatus } from "@calcom/lib/isOutOfBounds";
import type { PrismaClient } from "@calcom/prisma";
import type { NextApiRequest } from "next";
import type { TIsAvailableInputSchema, TIsAvailableOutputSchema } from "./isAvailable.schema";

interface IsAvailableOptions {
  ctx: {
    prisma: PrismaClient;
    req?: NextApiRequest | undefined;
  };
  input: TIsAvailableInputSchema;
}

/**
 * It does a super quick check whether that slot is bookable or not.
 * It doesn't consider slow things like querying the bookings, checking the calendars.
 *
 * getSchedule call is the only(but very slow) way to know if a slot is bookable
 */
export const isAvailableHandler = async ({
  ctx,
  input,
}: IsAvailableOptions): Promise<TIsAvailableOutputSchema> => {
  const { req } = ctx;
  const uid = req?.cookies?.uid;

  const { slots, eventTypeId } = input;

  // Get event type details for time bounds validation
  const eventTypeRepo = new EventTypeRepository(ctx.prisma);
  const eventType = await eventTypeRepo.findByIdMinimal({ id: eventTypeId });

  if (!eventType) {
    throw new HttpError({ statusCode: 404, message: "Event type not found" });
  }

  // Check each slot's availability
  // Without uid, we must not check for reserved slots because if uuid isn't set in cookie yet, but it is going to be through reserveSlot request soon, we could consider the slot as reserved accidentally.
  const slotsRepo = new PrismaSelectedSlotRepository(ctx.prisma);
  const reservedSlots = uid ? await slotsRepo.findManyReservedByOthers(slots, eventTypeId, uid) : [];

  // Map all slots to their availability status
  const slotsWithStatus: TIsAvailableOutputSchema["slots"] = slots.map((slot) => {
    const isReserved = reservedSlots.some(
      (reservedSlot) =>
        reservedSlot.slotUtcStartDate.toISOString() === slot.utcStartIso &&
        reservedSlot.slotUtcEndDate.toISOString() === slot.utcEndIso
    );

    if (isReserved) {
      return {
        ...slot,
        // Consider reserved slots as available till we fix issues with reserved slots
        // 1. Reservation must be attempted only if the cookie is set. reservation endpoint shouldn't create the cookie itself. It should skip reservation if there is no cookie in request
        // 2. We could consider reducing the reservation time.
        // 3. There could still be a problem that if multiple people on the same booking page try to book the same slot only one would be successful and other would be not and when they try to select some other slot, similarly only one would be successful and rest won't.
        // This could cause frustration for users because they would see the slot as available but when they try to book it, it is not available(Note we fetch the status of the selected slot only). This would be most common for first available slot
        // Maybe we want to reserve the slot when confirm button is clicked because in cases where it takes long time to book, it could disable the confirm button earlier.
        status: "available" as const,
        realStatus: "reserved" as const,
      };
    }

    // Check time bounds
    const timeStatus = getPastTimeAndMinimumBookingNoticeBoundsStatus({
      time: slot.utcStartIso,
      minimumBookingNotice: eventType.minimumBookingNotice,
    });

    return {
      ...slot,
      status: timeStatus.reason ?? "available",
    };
  });

  return {
    slots: slotsWithStatus,
  };
};
