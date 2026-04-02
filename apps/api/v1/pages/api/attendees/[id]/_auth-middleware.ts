import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const query = schemaQueryIdParseInt.parse(req.query);
  // @note: Here we make sure to only return attendee's of the user's own bookings if the user is not an admin.
  if (isSystemWideAdmin) return;
  // Find all user bookings, including attendees
  const attendee = await prisma.attendee.findFirst({
    where: { id: query.id, booking: { userId } },
  });
  // Flatten and merge all the attendees in one array
  if (!attendee) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
