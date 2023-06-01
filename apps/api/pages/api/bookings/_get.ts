import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaBookingReadPublic } from "~/lib/validations/booking";
import { schemaQuerySingleOrMultipleAttendeeEmails } from "~/lib/validations/shared/queryAttendeeEmail";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Find all bookings
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *         example: 123456789abcdefgh
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           oneOf:
 *            - type: integer
 *              example: 1
 *            - type: array
 *              items:
 *                type: integer
 *              example: [2, 3, 4]
 *       - in: query
 *         name: attendeeEmails
 *         required: false
 *         schema:
 *           oneOf:
 *            - type: string
 *              format: email
 *              example: john.doe@example.com
 *            - type: array
 *              items:
 *                type: string
 *                format: email
 *              example: [john.doe@example.com, jane.doe@example.com]
 *     operationId: listBookings
 *     tags:
 *     - bookings
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ArrayOfBookings"
 *             examples:
 *               bookings:
 *                 value: [
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
 *                 ]
 *       401:
 *         description: Authorization information is missing or invalid.
 *       404:
 *         description: No bookings were found
 */

/**
 * Constructs the WHERE clause for Prisma booking findMany operation.
 *
 * @param userId - The ID of the user making the request. This is used to filter bookings where the user is either the host or an attendee.
 * @param attendeeEmails - An array of emails provided in the request for filtering bookings by attendee emails, used in case of Admin calls.
 * @param userIds - An array of user IDs to be included in the filter. Defaults to an empty array, and an array of user IDs in case of Admin call containing it.
 * @param userEmails - An array of user emails to be included in the filter if it is an Admin call and contains userId in query parameter. Defaults to an empty array.
 *
 * @returns An object that represents the WHERE clause for the findMany/findUnique operation.
 */
function buildWhereClause(
  userId: number,
  attendeeEmails: string[],
  userIds: number[] = [],
  userEmails: string[] = []
) {
  const filterByAttendeeEmails = attendeeEmails.length > 0;
  const userFilter = userIds.length > 0 ? { userId: { in: userIds } } : { userId };
  let whereClause = {};
  if (filterByAttendeeEmails) {
    whereClause = {
      AND: [
        userFilter,
        {
          attendees: {
            some: {
              email: { in: attendeeEmails },
            },
          },
        },
      ],
    };
  } else {
    whereClause = {
      OR: [
        userFilter,
        {
          attendees: {
            some: {
              email: { in: userEmails },
            },
          },
        },
      ],
    };
  }

  return {
    ...whereClause,
  };
}

async function handler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const args: Prisma.BookingFindManyArgs = {};
  args.include = {
    attendees: true,
    user: true,
    payment: true,
  };

  const queryFilterForAttendeeEmails = schemaQuerySingleOrMultipleAttendeeEmails.parse(req.query);
  const attendeeEmails = Array.isArray(queryFilterForAttendeeEmails.attendeeEmail)
    ? queryFilterForAttendeeEmails.attendeeEmail
    : typeof queryFilterForAttendeeEmails.attendeeEmail === "string"
    ? [queryFilterForAttendeeEmails.attendeeEmail]
    : [];
  const filterByAttendeeEmails = attendeeEmails.length > 0;

  /** Only admins can query other users */
  if (isAdmin) {
    if (req.query.userId) {
      const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
      const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { email: true },
      });
      const userEmails = users.map((u) => u.email);
      args.where = buildWhereClause(userId, attendeeEmails, userIds, userEmails);
    } else if (filterByAttendeeEmails) {
      args.where = buildWhereClause(userId, attendeeEmails, [], []);
    }
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });
    if (!user) {
      throw new HttpError({ message: "User not found", statusCode: 500 });
    }
    args.where = buildWhereClause(userId, attendeeEmails, [], []);
  }
  const data = await prisma.booking.findMany(args);
  return { bookings: data.map((booking) => schemaBookingReadPublic.parse(booking)) };
}

export default defaultResponder(handler);
