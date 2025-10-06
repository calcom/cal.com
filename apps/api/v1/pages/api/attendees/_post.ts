import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";
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
  const { userId, isSystemWideAdmin, isOrganizationOwnerOrAdmin } = req;
  const body = schemaAttendeeCreateBodyParams.parse(req.body);

  if (!isSystemWideAdmin) {
    if (isOrganizationOwnerOrAdmin) {
      const booking = await prisma.booking.findUnique({
        where: { id: body.bookingId },
        select: { userId: true },
      });
      if (booking) {
        const bookingUserId = booking.userId;
        if (bookingUserId) {
          const accessibleUsersIds = await getAccessibleUsers({
            adminUserId: userId,
            memberUserIds: [bookingUserId],
          });
          if (accessibleUsersIds.length > 0) {
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
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) throw new HttpError({ statusCode: 404, message: "User not found" });

    const bookingAsOwner = prisma.booking.findFirst({
      where: { userId, id: body.bookingId },
      select: { id: true },
    });

    const bookingAsAttendee = prisma.booking.findMany({
      where: {
        id: body.bookingId,
        attendees: { some: { email: user.email } },
      },
    });

    const bookingAsEventTypeOwner = prisma.booking.findMany({
      where: {
        id: body.bookingId,
        eventType: {
          owner: { id: userId },
        },
      },
    });

    const bookingAsTeamOwnerOrAdmin = prisma.booking.findMany({
      where: {
        id: body.bookingId,
        eventType: {
          team: {
            members: {
              some: { userId, role: { in: ["ADMIN", "OWNER"] }, accepted: true },
            },
          },
        },
      },
    });

    const [ownerResult, attendeeResult, eventTypeOwnerResult, teamOwnerResult] = await Promise.all([
      bookingAsOwner,
      bookingAsAttendee,
      bookingAsEventTypeOwner,
      bookingAsTeamOwnerOrAdmin,
    ]);

    const hasAccess =
      !!ownerResult || !!attendeeResult.length || !!eventTypeOwnerResult.length || !!teamOwnerResult.length;

    if (!hasAccess) {
      throw new HttpError({ statusCode: 403, message: "Forbidden" });
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
