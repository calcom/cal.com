import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import { schemaAttendeeReadPublic } from "~/lib/validations/attendee";

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
async function handler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const args: Prisma.AttendeeFindManyArgs = isSystemWideAdmin ? {} : { where: { booking: { userId } } };
  const data = await prisma.attendee.findMany(args);
  const attendees = data.map((attendee) => schemaAttendeeReadPublic.parse(attendee));
  if (!attendees) throw new HttpError({ statusCode: 404, message: "No attendees were found" });
  return { attendees };
}

export default defaultResponder(handler);
