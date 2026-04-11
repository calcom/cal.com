import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { Prisma } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler"] });

export const getBooking = async (bookingId: number) => {
  const bookingRepository = new BookingRepository(prisma);
  try {
    const booking = await bookingRepository.findByIdForDailyVideoWebhook({ bookingId });
    return booking;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
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
    throw error;
  }
};

export type getBookingResponse = Awaited<ReturnType<typeof getBooking>>;
