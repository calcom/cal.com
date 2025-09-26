import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { PrismaBookingReferenceRepository } from "@calcom/lib/server/repository/PrismaBookingReferenceRepository";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { prisma } from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  // Here we make sure to only return references of the user's own bookings if the user is not an admin.
  if (isSystemWideAdmin) return;
  // Find all references where the user has bookings

  const bookingReferenceRepo = new PrismaBookingReferenceRepository({ prismaClient: prisma });
  const bookingRepo = new BookingRepository(prisma);

  const [booking, bookingReference] = await Promise.all([
    bookingRepo.findBookingByReferenceAndUserId({ referenceId: id, userId }),
    bookingReferenceRepo.findBookingReferenceById(id),
  ]);

  if (!booking) {
    throw new HttpError({ statusCode: 403, message: "Forbidden" });
  }

  if (!bookingReference) {
    throw new HttpError({ statusCode: 404, message: "Booking reference not found" });
  }
}

export default authMiddleware;
