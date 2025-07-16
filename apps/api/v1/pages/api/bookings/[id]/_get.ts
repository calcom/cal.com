import type { NextApiRequest } from "next";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";
import { schemaBookingReadPublic } from "~/lib/validations/booking";
import { schemaQuerySingleOrMultipleExpand } from "~/lib/validations/shared/queryExpandRelations";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Find a booking
 *     operationId: getBookingById
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the booking to get
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Booking"
 *             examples:
 *               booking:
 *                 value:
 *                   {
 *                     "booking": {
 *                       "id": 91,
 *                       "userId": 5,
 *                       "description": "",
 *                       "eventTypeId": 7,
 *                       "uid": "bFJeNb2uX8ANpT3JL5EfXw",
 *                       "title": "60min between Pro Example and John Doe",
 *                       "startTime": "2023-05-25T09:30:00.000Z",
 *                       "endTime": "2023-05-25T10:30:00.000Z",
 *                       "attendees": [
 *                         {
 *                           "email": "john.doe@example.com",
 *                           "name": "John Doe",
 *                           "timeZone": "Asia/Kolkata",
 *                           "locale": "en"
 *                         }
 *                       ],
 *                       "user": {
 *                         "email": "pro@example.com",
 *                         "name": "Pro Example",
 *                         "timeZone": "Asia/Kolkata",
 *                         "locale": "en"
 *                       },
 *                       "payment": [
 *                         {
 *                           "id": 1,
 *                           "success": true,
 *                           "paymentOption": "ON_BOOKING"
 *                         }
 *                       ],
 *                       "metadata": {},
 *                       "status": "ACCEPTED",
 *                       "responses": {
 *                         "email": "john.doe@example.com",
 *                         "name": "John Doe",
 *                         "location": {
 *                           "optionValue": "",
 *                           "value": "inPerson"
 *                         }
 *                       }
 *                     }
 *                   }
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Booking was not found
 */

export async function getHandler(req: NextApiRequest) {
  const { query, userId, isSystemWideAdmin, isOrganizationOwnerOrAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  const queryFilterForExpand = schemaQuerySingleOrMultipleExpand.parse(req.query.expand);
  const expand = Array.isArray(queryFilterForExpand)
    ? queryFilterForExpand
    : queryFilterForExpand
    ? [queryFilterForExpand]
    : [];
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      attendees: true,
      user: true,
      payment: true,
      eventType: expand.includes("team") ? { include: { team: true } } : false,
    },
  });

  if (!booking) {
    throw new ErrorWithCode(ErrorCode.BookingNotFound, "Booking not found");
  }

  await checkBookingAccess(req, booking);

  return { booking: schemaBookingReadPublic.parse(booking) };
}

async function checkBookingAccess(req: NextApiRequest, booking: any) {
  const { userId, isSystemWideAdmin, isOrganizationOwnerOrAdmin } = req;

  if (isSystemWideAdmin) {
    return;
  }

  if (isOrganizationOwnerOrAdmin) {
    const bookingUserId = booking.userId;
    if (bookingUserId) {
      const accessibleUsersIds = await getAccessibleUsers({
        adminUserId: userId,
        memberUserIds: [bookingUserId],
      });
      if (accessibleUsersIds.length > 0) return;
    }
  }

  if (booking.userId === userId) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user && booking.attendees?.some((attendee: any) => attendee.email === user.email)) {
    return;
  }

  if (booking.eventType?.userId === userId) {
    return;
  }

  if (booking.eventType?.teamId) {
    const teamMembership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId: booking.eventType.teamId,
        role: { in: ["ADMIN", "OWNER"] },
        accepted: true,
      },
    });
    if (teamMembership) {
      return;
    }
  }

  throw new HttpError({ statusCode: 403, message: "You are not authorized to access this booking" });
}

export default defaultResponder(getHandler);
