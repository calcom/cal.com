import type { NextApiRequest } from "next";
import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaAttendeeEditBodyParams, schemaAttendeeReadPublic } from "~/lib/validations/attendee";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /attendees/{id}:
 *   patch:
 *     summary: Edit an existing attendee
 *     operationId: editAttendeeById
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
 *                 example: email@example.com
 *               name:
 *                 type: string
 *                 example: John Doe
 *               timeZone:
 *                 type: string
 *                 example: Europe/London
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *          example: 3
 *        required: true
 *        description: ID of the attendee to edit
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee edited successfuly
 *       400:
 *        description: Bad request. Attendee body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaAttendeeEditBodyParams.parse(body);
  await checkPermissions(req, data);
  const attendee = await prisma.attendee.update({ where: { id }, data });
  return { attendee: schemaAttendeeReadPublic.parse(attendee) };
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaAttendeeEditBodyParams>) {
  const { isAdmin, prisma } = req;
  if (isAdmin) return;
  const { userId } = req;
  const { bookingId } = body;
  if (bookingId) {
    // Ensure that the booking the attendee is being added to belongs to the user
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
    if (!booking) throw new HttpError({ statusCode: 403, message: "You don't have access to the booking" });
  }
}

export default defaultResponder(patchHandler);
