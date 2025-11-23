import type { NextApiRequest } from "next";
import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaAttendeeEditBodyParams, schemaAttendeeReadPublic } from "~/lib/validations/attendee";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /attendees/{id}:
 *   patch:
 *     operationId: editAttendeeById
 *     summary: Edit an existing attendee
 *     requestBody:
 *       description: Edit an existing attendee related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               timeZone:
 *                 type: string
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the attendee to get
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee edited successfully
 *       400:
 *        description: Bad request. Attendee body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */

export async function patchHandler(req: NextApiRequest) {
  const { query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaAttendeeEditBodyParams.parse(body);
  await checkPermissions(req, data);
  const attendee = await prisma.attendee.update({ where: { id }, data });
  return { attendee: schemaAttendeeReadPublic.parse(attendee) };
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaAttendeeEditBodyParams>) {
  const { isSystemWideAdmin } = req;
  if (isSystemWideAdmin) return;
  const { userId } = req;
  const { bookingId } = body;
  if (bookingId) {
    // Ensure that the booking the attendee is being added to belongs to the user
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
    if (!booking) throw new HttpError({ statusCode: 403, message: "You don't have access to the booking" });
  }
}

export default defaultResponder(patchHandler);
