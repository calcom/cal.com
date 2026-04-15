import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import { withMiddleware } from "~/lib/helpers/withMiddleware";

const attendeeSelect: Prisma.AttendeeSelect = {
  id: true,
  bookingId: true,
  name: true,
  email: true,
  timeZone: true,
};

type AttendeeResponse = {
  id: number;
  bookingId: number | null;
  name: string;
  email: string;
  timeZone: string;
};

const MAX_TAKE = 250;

/**
 * @swagger
 * /attendees:
 *   get:
 *     operationId: listAttendees
 *     summary: Find all attendees
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *       - in: query
 *         name: take
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 250
 *         description: Number of attendees to return (max 250)
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *     tags:
 *     - attendees
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No attendees were found
 */
export async function handler(req: NextApiRequest): Promise<{ attendees: AttendeeResponse[] }> {
  const { userId, isSystemWideAdmin, pagination } = req;
  const take = Math.min(pagination.take, MAX_TAKE);
  const skip = pagination.skip;

  const where = isSystemWideAdmin ? {} : { booking: { userId } };

  const attendees = await prisma.attendee.findMany({
    where,
    select: attendeeSelect,
    take,
    skip,
    orderBy: { id: "asc" },
  });

  if (!attendees.length) throw new HttpError({ statusCode: 404, message: "No attendees were found" });
  return { attendees };
}

export default withMiddleware("pagination")(defaultResponder(handler));
