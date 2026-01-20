import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  // Here we make sure to only return references of the user's own bookings if the user is not an admin.
  if (isSystemWideAdmin) return;
  // Find all references where the user has bookings
  const bookingReference = await prisma.bookingReference.findFirst({
    where: { id, booking: { userId }, deleted: null },
  });
  if (!bookingReference) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
