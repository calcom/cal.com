import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { PrismaBookingReferenceRepository } from "@calcom/lib/server/repository/PrismaBookingReferenceRepository";
import { prisma as prismaClient } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["daily-video-webhook-handler"] });

export const getBookingReference = async (roomName: string) => {
  const bookingReferenceRepo = new PrismaBookingReferenceRepository({ prismaClient });
  const bookingReference = await bookingReferenceRepo.findDailyVideoReferenceByRoomName({ roomName });
  // TODO: inconclusive error, could be thrown in multiple situations (not found, bookingId null)
  if (!bookingReference?.bookingId) {
    log.error(
      "bookingReference not found error:",
      safeStringify({
        bookingReference,
        roomName,
      })
    );

    throw new HttpError({ message: "Booking reference not found", statusCode: 200 });
  }

  return bookingReference;
};
