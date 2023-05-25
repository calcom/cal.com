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
 *                     "id": 1,
 *                     "description": "Meeting with John",
 *                     "eventTypeId": 2,
 *                     "uid": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
 *                     "title": "Business Meeting",
 *                     "startTime": "2023-04-20T10:00:00.000Z",
 *                     "endTime": "2023-04-20T11:00:00.000Z",
 *                     "timeZone": "Europe/London",
 *                     "attendees": [
 *                       {
 *                         "email": "example@cal.com",
 *                         "name": "John Doe",
 *                         "timeZone": "Europe/London",
 *                         "locale": "en"
 *                       }
 *                     ]
 *                   }
 *                 ]
 *       401:
 *         description: Authorization information is missing or invalid.
 *       404:
 *         description: No bookings were found
 */

async function handler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const args: Prisma.BookingFindManyArgs = {};
  args.include = {
    attendees: true,
    user: true,
  };

  /** Only admins can query other users */
  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true },
    });
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
  }
  const data = await prisma.booking.findMany(args);
  return { bookings: data.map((booking) => schemaBookingReadPublic.parse(booking)) };
}

export default defaultResponder(handler);
