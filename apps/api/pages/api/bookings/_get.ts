import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaBookingReadPublic } from "~/lib/validations/booking";
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

const getAttendeeEmails = (
  query: Partial<{
    [key: string]: string | string[];
  }>
) => {
  if (!query.attendeeEmails) {
    return [];
  }

  return Array.isArray(query.attendeeEmails) ? query.attendeeEmails : query.attendeeEmails.split(",");
};

async function handler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const args: Prisma.BookingFindManyArgs = {};
  args.include = {
    attendees: true,
    user: true,
    payment: true,
  };

  const attendeeEmails = getAttendeeEmails(req.query);
  const filterByAttendeeEmails = attendeeEmails.length > 0;

  /** Only admins can query other users */
  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true },
    });
    if (!filterByAttendeeEmails) {
      const userEmails = users.map((u) => u.email);
      args.where = {
        OR: [
          { userId: { in: userIds } },
          {
            attendees: {
              some: {
                email: { in: userEmails },
              },
            },
          },
        ],
      };
    } else {
      args.where = {
        AND: [
          { userId: { in: userIds } },
          {
            attendees: {
              some: {
                email: { in: attendeeEmails },
              },
            },
          },
        ],
      };
    }
  } else if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });
    if (!user) {
      throw new HttpError({ message: "User not found", statusCode: 500 });
    }
    args.where = {
      OR: [
        {
          userId,
        },
        {
          attendees: {
            some: {
              email: user.email,
            },
          },
        },
      ],
    };
  } else if (filterByAttendeeEmails) {
    args.where = {
      AND: [
        { userId },
        {
          attendees: {
            some: {
              email: { in: attendeeEmails },
            },
          },
        },
      ],
    };
  }
  const data = await prisma.booking.findMany(args);
  return { bookings: data.map((booking) => schemaBookingReadPublic.parse(booking)) };
}

export default defaultResponder(handler);
