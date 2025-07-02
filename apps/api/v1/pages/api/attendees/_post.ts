import type { NextApiRequest } from "next";

import { checkPermissionWithFallback } from "@calcom/features/pbac/lib/checkPermissionWithFallback";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { schemaAttendeeCreateBodyParams, schemaAttendeeReadPublic } from "~/lib/validations/attendee";

/**
 * @swagger
 * /attendees:
 *   post:
 *     operationId: addAttendee
 *     summary: Creates a new attendee
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     requestBody:
 *       description: Create a new attendee related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - name
 *               - email
 *               - timeZone
 *             properties:
 *               bookingId:
 *                 type: number
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               timeZone:
 *                 type: string
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee created
 *       400:
 *        description: Bad request. Attendee body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const body = schemaAttendeeCreateBodyParams.parse(req.body);

  if (!isSystemWideAdmin) {
    const userBooking = await prisma.booking.findFirst({
      where: { userId, id: body.bookingId },
      select: { id: true, eventType: { select: { teamId: true } } },
    });
    // Here we make sure to only return attendee's of the user's own bookings.
    if (!userBooking) throw new HttpError({ statusCode: 403, message: "Forbidden" });

    if (userBooking.eventType?.teamId) {
      const hasPermission = await checkPermissionWithFallback({
        userId,
        teamId: userBooking.eventType.teamId,
        permission: "booking.update",
        fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      });
      if (!hasPermission) throw new HttpError({ statusCode: 403, message: "Forbidden" });
    }
  }

  const data = await prisma.attendee.create({
    data: {
      email: body.email,
      name: body.name,
      timeZone: body.timeZone,
      booking: { connect: { id: body.bookingId } },
    },
  });

  return {
    attendee: schemaAttendeeReadPublic.parse(data),
    message: "Attendee created successfully",
  };
}

export default defaultResponder(postHandler);
