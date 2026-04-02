import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
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
  const { query } = req;
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
      // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
      attendees: true,
      // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
      user: true,
      // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
      payment: true,
      eventType: expand.includes("team") ? { include: { team: true } } : false,
    },
  });

  if (!booking) {
    throw new ErrorWithCode(ErrorCode.BookingNotFound, "Booking not found");
  }

  return { booking: schemaBookingReadPublic.parse(booking) };
}

export default defaultResponder(getHandler);
