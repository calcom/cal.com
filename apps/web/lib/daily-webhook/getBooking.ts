import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler"] });

export const getBooking = async (bookingId: number) => {
  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByIdWithUserAndEventType(bookingId);

  if (!booking) {
    log.error(
      "Couldn't find Booking Id:",
      safeStringify({
        bookingId,
      })
    );

    throw new HttpError({
      message: `Booking of id ${bookingId} does not exist or does not contain daily video as location`,
      statusCode: 404,
    });
  }
  return booking;
};

export type getBookingResponse = Awaited<ReturnType<typeof getBooking>>;
