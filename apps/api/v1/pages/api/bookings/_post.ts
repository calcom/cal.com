import type { NextApiRequest } from "next";

import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";
import getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CreationSource } from "@calcom/prisma/enums";

import { getAccessibleUsers } from "~/lib/utils/retrieveScopedAccessibleUsers";

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
 *               - eventTypeId
 *               - start
 *               - responses
 *               - timeZone
 *               - language
 *               - metadata
 *             properties:
 *               eventTypeId:
 *                 type: integer
 *                 description: 'ID of the event type to book'
 *               start:
 *                 type: string
 *                 format: date-time
 *                 description: 'Start time of the Event'
 *               end:
 *                 type: string
 *                 format: date-time
 *                 description: 'End time of the Event'
 *               rescheduleUid:
 *                 type: string
 *                 format: UID
 *                 description: 'Uid of the booking to reschedule'
 *               responses:
 *                 type: object
 *                 required:
 *                    - name
 *                    - email
 *                    - location
 *                 properties:
 *                    name:
 *                      type: string
 *                      description: 'Attendee full name'
 *                    email:
 *                      type: string
 *                      format: email
 *                      description: 'Attendee email address'
 *                    location:
 *                      type: object
 *                      properties:
 *                        optionValue:
 *                          type: string
 *                          description: 'Option value for the location'
 *                        value:
 *                          type: string
 *                          description: 'The meeting URL, Phone number or Address'
 *                      description: 'Meeting location'
 *               metadata:
 *                 type: object
 *                 properties: {}
 *                 description: 'Any metadata associated with the booking'
 *               timeZone:
 *                 type: string
 *                 description: 'TimeZone of the Attendee'
 *               language:
 *                 type: string
 *                 description: 'Language of the Attendee'
 *               title:
 *                 type: string
 *                 description: 'Booking event title'
 *               recurringEventId:
 *                 type: integer
 *                 description: 'Recurring event ID if the event is recurring'
 *               description:
 *                 type: string
 *                 description: 'Event description'
 *               status:
 *                 type: string
 *                 description: 'Acceptable values one of ["ACCEPTED", "PENDING", "CANCELLED", "REJECTED"]'
 *               seatsPerTimeSlot:
 *                 type: integer
 *                 description: 'The number of seats for each time slot'
 *               seatsShowAttendees:
 *                 type: boolean
 *                 description: 'Share Attendee information in seats'
 *               seatsShowAvailabilityCount:
 *                 type: boolean
 *                 description: 'Show the number of available seats'
 *               smsReminderNumber:
 *                 type: number
 *                 description: 'SMS reminder number'
 *           examples:
 *             New Booking example:
 *               value:
 *                 {
 *                   "eventTypeId": 2323232,
 *                   "start": "2023-05-24T13:00:00.000Z",
 *                   "end": "2023-05-24T13:30:00.000Z",
 *                   "responses":{
 *                     "name": "Hello Hello",
 *                     "email": "hello@gmail.com",
 *                     "metadata": {},
 *                     "location": "Calcom HQ",
 *                   },
 *                   "timeZone": "Europe/London",
 *                   "language": "en",
 *                   "title": "Debugging between Syed Ali Shahbaz and Hello Hello",
 *                   "description": null,
 *                   "status": "PENDING",
 *                   "smsReminderNumber": null
 *                 }
 *
 *     tags:
 *       - bookings
 *     responses:
 *       200:
 *         description: Booking(s) created successfully.
 *         content:
 *           application/json:
 *             examples:
 *               booking created successfully example:
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
  const { isSystemWideAdmin, isOrganizationOwnerOrAdmin } = req;
  let userId = req.userId;

  req.body = {
    ...req.body,
    creationSource: CreationSource.API_V1,
  };
  if (isSystemWideAdmin) userId = req.body.userId || userId;

  if (req.body.eventTypeId !== undefined && typeof req.body.eventTypeId !== "number") {
    throw new HttpError({
      statusCode: 400,
      message: "Bad request, eventTypeId must be a number",
    });
  }

  if (isOrganizationOwnerOrAdmin) {
    const accessibleUsersIds = await getAccessibleUsers({
      adminUserId: userId,
      memberUserIds: [req.body.userId || userId],
    });
    const [requestedUserId] = accessibleUsersIds;
    userId = requestedUserId || userId;
  }

  try {
    const regularBookingService = getRegularBookingService();

    return await regularBookingService.createBookingForApiV1({
      bookingData: req.body,
      bookingMeta: {
        userId,
        hostname: req.headers.host || "",
        forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
      },
      bookingDataSchemaGetter: getBookingDataSchemaForApi,
    });
  } catch (error: unknown) {
    const knownError = error as Error;
    if (knownError?.message === ErrorCode.NoAvailableUsersFound) {
      throw new HttpError({ statusCode: 400, message: knownError.message });
    }

    if (knownError?.message === ErrorCode.RequestBodyInvalid) {
      throw new HttpError({ statusCode: 400, message: knownError.message });
    }

    if (knownError?.message === ErrorCode.EventTypeNotFound) {
      throw new HttpError({ statusCode: 400, message: knownError.message });
    }

    throw error;
  }
}

export default defaultResponder(handler);
