import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  // Here we make sure to only return references of the user's own bookings if the user is not an admin.
  if (isAdmin) return;
  // Find all references where the user has bookings
  const bookingReference = await prisma.bookingReference.findFirst({
    where: { id, booking: { userId } },
  });
  if (!bookingReference) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
