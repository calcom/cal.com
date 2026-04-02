import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";
import type { z } from "zod";
import { eventTypeSelect } from "~/lib/selects/event-type";
import type { schemaEventTypeBaseBodyParams } from "~/lib/validations/event-type";
import { schemaEventTypeEditBodyParams } from "~/lib/validations/event-type";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";
import ensureOnlyMembersAsHosts from "~/pages/api/event-types/_utils/ensureOnlyMembersAsHosts";
import checkTeamEventEditPermission from "../_utils/checkTeamEventEditPermission";

/**
 * @swagger
 * /event-types/{id}:
 *   patch:
 *     operationId: editEventTypeById
 *     summary: Edit an existing eventType
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventType to edit
 *     requestBody:
 *       description: Create a new event-type related to your user or team
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               length:
 *                 type: integer
 *                 description: Duration of the event type in minutes
 *               metadata:
 *                 type: object
 *                 description: Metadata relating to event type. Pass {} if empty
 *               title:
 *                 type: string
 *                 description: Title of the event type
 *               slug:
 *                 type: string
 *                 description: Unique slug for the event type
 *               scheduleId:
 *                 type: number
 *                 description: The ID of the schedule for this event type
 *               hosts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: number
 *                     isFixed:
 *                       type: boolean
 *                       description: Host MUST be available for any slot to be bookable.
 *               hidden:
 *                 type: boolean
 *                 description: If the event type should be hidden from your public booking page
 *               position:
 *                 type: integer
 *                 description: The position of the event type on the public booking page
 *               teamId:
 *                 type: integer
 *                 description: Team ID if the event type should belong to a team
 *               periodType:
 *                 type: string
 *                 enum: [UNLIMITED, ROLLING, RANGE]
 *                 description: To decide how far into the future an invitee can book an event with you
 *               periodStartDate:
 *                 type: string
 *                 format: date-time
 *                 description: Start date of bookable period (Required if periodType is 'range')
 *               periodEndDate:
 *                 type: string
 *                 format: date-time
 *                 description: End date of bookable period (Required if periodType is 'range')
 *               periodDays:
 *                 type: integer
 *                 description: Number of bookable days (Required if periodType is rolling)
 *               periodCountCalendarDays:
 *                 type: boolean
 *                 description: If calendar days should be counted for period days
 *               requiresConfirmation:
 *                 type: boolean
 *                 description: If the event type should require your confirmation before completing the booking
 *               recurringEvent:
 *                 type: object
 *                 description: If the event should recur every week/month/year with the selected frequency
 *                 properties:
 *                   interval:
 *                     type: integer
 *                   count:
 *                     type: integer
 *                   freq:
 *                     type: integer
 *               disableGuests:
 *                 type: boolean
 *                 description: If the event type should disable adding guests to the booking
 *               hideCalendarNotes:
 *                 type: boolean
 *                 description: If the calendar notes should be hidden from the booking
 *               minimumBookingNotice:
 *                 type: integer
 *                 description: Minimum time in minutes before the event is bookable
 *               beforeEventBuffer:
 *                 type: integer
 *                 description: Number of minutes of buffer time before a Cal Event
 *               afterEventBuffer:
 *                 type: integer
 *                 description: Number of minutes of buffer time after a Cal Event
 *               schedulingType:
 *                 type: string
 *                 description: The type of scheduling if a Team event. Required for team events only
 *                 enum: [ROUND_ROBIN, COLLECTIVE]
 *               price:
 *                 type: integer
 *                 description: Price of the event type booking
 *               currency:
 *                 type: string
 *                 description: Currency acronym. Eg- usd, eur, gbp, etc.
 *               slotInterval:
 *                 type: integer
 *                 description: The intervals of available bookable slots in minutes
 *               successRedirectUrl:
 *                 type: string
 *                 format: url
 *                 description: A valid URL where the booker will redirect to, once the booking is completed successfully
 *               description:
 *                 type: string
 *                 description: Description of the event type
 *               seatsPerTimeSlot:
 *                 type: integer
 *                 description: 'The number of seats for each time slot'
 *               seatsShowAttendees:
 *                 type: boolean
 *                 description: 'Share Attendee information in seats'
 *               seatsShowAvailabilityCount:
 *                 type: boolean
 *                 description: 'Show the number of available seats'
 *               locations:
 *                 type: array
 *                 description: A list of all available locations for the event type
 *                 items:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       - type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: ['integrations:daily']
 *                       - type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: ['attendeeInPerson']
 *                       - type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: ['inPerson']
 *                           address:
 *                             type: string
 *                           displayLocationPublicly:
 *                             type: boolean
 *                       - type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: ['link']
 *                           link:
 *                             type: string
 *                           displayLocationPublicly:
 *                             type: boolean
 *           example:
 *              event-type:
 *                summary: An example of event type PATCH request
 *                value:
 *                  length: 60
 *                  requiresConfirmation: true
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/docs/core-features/event-types
 *     responses:
 *       201:
 *         description: OK, eventType edited successfully
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const {
    hosts = [],
    bookingLimits,
    durationLimits,
    locations,
    /** FIXME: Updating event-type children from API not supported for now  */
    children: _,
    ...parsedBody
  } = schemaEventTypeEditBodyParams.parse(body);

  const data: Prisma.EventTypeUpdateArgs["data"] = {
    ...parsedBody,
    teamId: parsedBody.teamId === null ? undefined : parsedBody.teamId,
    bookingLimits: bookingLimits === null ? Prisma.DbNull : bookingLimits,
    durationLimits: durationLimits === null ? Prisma.DbNull : durationLimits,
    locations: locations === null ? Prisma.DbNull : locations,
  };

  if (hosts) {
    await ensureOnlyMembersAsHosts(req, parsedBody);
    data.hosts = {
      deleteMany: {},
      create: hosts.map((host) => ({
        ...host,
        isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
      })),
    };
  }
  await checkPermissions(req, parsedBody);
  const eventType = await prisma.eventType.update({ where: { id }, data, select: eventTypeSelect });
  return { event_type: eventType };
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaEventTypeBaseBodyParams>) {
  const { userId, isSystemWideAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isSystemWideAdmin) return;
  /** Only event type owners can modify it */
  const eventType = await prisma.eventType.findFirst({ where: { id, userId } });
  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  await checkTeamEventEditPermission(req, body);
}

export default patchHandler;
