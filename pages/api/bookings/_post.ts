import type { NextApiRequest } from "next";

import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { defaultResponder } from "@calcom/lib/server";

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Creates a new booking
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     operationId: addBooking
 *     requestBody:
 *       description: Create a new booking related to one of your event-types
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start
 *               - end
 *             properties:
 *               title:
 *                 type: string
 *                 description: 'Booking event title'
 *               start:
 *                 type: string
 *                 format: date-time
 *                 description: 'Start time of the Event'
 *               end:
 *                 type: string
 *                 format: date-time
 *                 description: 'End time of the Event'
 *               recurringEventId:
 *                 type: integer
 *                 description: 'Recurring event ID if the event is recurring'
 *               description:
 *                 type: string
 *                 description: 'Event description'
 *               status:
 *                 type: string
 *                 description: 'Acceptable values one of ["ACCEPTED", "PENDING", "CANCELLED", "REJECTED"]'
 *               location:
 *                 type: string
 *                 description: 'Meeting location'
 *               seatsPerTimeSlot:
 *                 type: integer
 *                 description: 'The number of seats for each time slot'
 *               seatsShowAttendees:
 *                 type: boolean
 *                 description: 'Share Attendee information in seats'
 *               smsReminderNumber:
 *                 type: number
 *                 description: 'SMS reminder number'
 *               attendees:
 *                 type: array
 *                 description: 'List of attendees of the booking'
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     timeZone:
 *                       type: string
 *                     locale:
 *                       type: string
 *
 *     tags:
 *       - bookings
 *     responses:
 *       201:
 *         description: Booking(s) created successfully.
 *       400:
 *         description: |
 *           Bad request
 *           <table>
 *             <tr>
 *               <td>Message</td>
 *               <td>Cause</td>
 *             </tr>
 *             <tr>
 *               <td>Booking body is invalid</td>
 *               <td>Missing property on booking entity.</td>
 *             </tr>
 *             <tr>
 *               <td>Invalid eventTypeId</td>
 *               <td>The provided eventTypeId does not exist.</td>
 *             </tr>
 *             <tr>
 *               <td>Missing recurringCount</td>
 *               <td>The eventType is recurring, and no recurringCount was passed.</td>
 *             </tr>
 *             <tr>
 *               <td>Invalid recurringCount</td>
 *               <td>The provided recurringCount is greater than the eventType recurring config</td>
 *             </tr>
 *           </table>
 *       401:
 *         description: Authorization information is missing or invalid.
 */
async function handler(req: NextApiRequest) {
  const { userId, isAdmin } = req;
  if (isAdmin) req.userId = req.body.userId || userId;
  const booking = await handleNewBooking(req);
  return booking;
}

export default defaultResponder(handler);
