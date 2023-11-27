import { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { MembershipRole } from "@calcom/prisma/client";

import { schemaEventTypeCreateBodyParams, schemaEventTypeReadPublic } from "~/lib/validations/event-type";
import { canUserAccessTeamWithRole } from "~/pages/api/teams/[teamId]/_auth-middleware";

import checkParentEventOwnership from "./_utils/checkParentEventOwnership";
import checkTeamEventEditPermission from "./_utils/checkTeamEventEditPermission";
import checkUserMembership from "./_utils/checkUserMembership";
import ensureOnlyMembersAsHosts from "./_utils/ensureOnlyMembersAsHosts";

/**
 * @swagger
 * /event-types:
 *   post:
 *     summary: Creates a new event type
 *     operationId: addEventType
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *     requestBody:
 *       description: Create a new event-type related to your user or team
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - length
 *               - metadata
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
 *               scheduleId:
 *                 type: number
 *                 description: The ID of the schedule for this event type
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
 *                 enum: [ROUND_ROBIN, COLLECTIVE, MANAGED]
 *               price:
 *                 type: integer
 *                 description: Price of the event type booking
 *               parentId:
 *                 type: integer
 *                 description: EventTypeId of the parent managed event
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
 *           examples:
 *              event-type:
 *                summary: An example of an individual event type POST request
 *                value:
 *                  title: Hello World
 *                  slug: hello-world
 *                  length: 30
 *                  hidden: false
 *                  position: 0
 *                  eventName: null
 *                  timeZone: null
 *                  scheduleId: 5
 *                  periodType: UNLIMITED
 *                  periodStartDate: 2023-02-15T08:46:16.000Z
 *                  periodEndDate: 2023-0-15T08:46:16.000Z
 *                  periodDays: null
 *                  periodCountCalendarDays: false
 *                  requiresConfirmation: false
 *                  recurringEvent: null
 *                  disableGuests: false
 *                  hideCalendarNotes: false
 *                  minimumBookingNotice: 120
 *                  beforeEventBuffer: 0
 *                  afterEventBuffer: 0
 *                  price: 0
 *                  currency: usd
 *                  slotInterval: null
 *                  successRedirectUrl: null
 *                  description: A test event type
 *                  metadata: {
 *                    apps: {
 *                      stripe: {
 *                        price: 0,
 *                        enabled: false,
 *                        currency: usd
 *                      }
 *                    }
 *                  }
 *              team-event-type:
 *                summary: An example of a team event type POST request
 *                value:
 *                  title: "Tennis class"
 *                  slug: "tennis-class-{{$guid}}"
 *                  length: 60
 *                  hidden: false
 *                  position: 0
 *                  teamId: 3
 *                  eventName: null
 *                  timeZone: null
 *                  periodType: "UNLIMITED"
 *                  periodStartDate: null
 *                  periodEndDate: null
 *                  periodDays: null
 *                  periodCountCalendarDays: null
 *                  requiresConfirmation: true
 *                  recurringEvent:
 *                    interval: 2
 *                    count: 10
 *                    freq: 2
 *                  disableGuests: false
 *                  hideCalendarNotes: false
 *                  minimumBookingNotice: 120
 *                  beforeEventBuffer: 0
 *                  afterEventBuffer: 0
 *                  schedulingType: "COLLECTIVE"
 *                  price: 0
 *                  currency: "usd"
 *                  slotInterval: null
 *                  successRedirectUrl: null
 *                  description: null
 *                  locations:
 *                    - address: "London"
 *                      type: "inPerson"
 *                  metadata: {}
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/core-features/event-types
 *     responses:
 *       201:
 *         description: OK, event type created
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma, body } = req;

  const {
    hosts = [],
    bookingLimits,
    durationLimits,
    /** FIXME: Adding event-type children from API not supported for now  */
    children: _,
    ...parsedBody
  } = schemaEventTypeCreateBodyParams.parse(body || {});

  let data: Prisma.EventTypeCreateArgs["data"] = {
    ...parsedBody,
    userId,
    users: { connect: { id: userId } },
    bookingLimits: bookingLimits === null ? Prisma.DbNull : bookingLimits,
    durationLimits: durationLimits === null ? Prisma.DbNull : durationLimits,
  };

  await checkPermissions(req);

  if (parsedBody.parentId) {
    await checkParentEventOwnership(req);
    await checkUserMembership(req);
  }

  if (isAdmin && parsedBody.userId) {
    data = { ...parsedBody, users: { connect: { id: parsedBody.userId } } };
  }

  await checkTeamEventEditPermission(req, parsedBody);
  await ensureOnlyMembersAsHosts(req, parsedBody);

  if (hosts) {
    data.hosts = { createMany: { data: hosts } };
  }

  const eventType = await prisma.eventType.create({ data, include: { hosts: true } });

  return {
    event_type: schemaEventTypeReadPublic.parse(eventType),
    message: "Event type created successfully",
  };
}

async function checkPermissions(req: NextApiRequest) {
  const { isAdmin } = req;
  const body = schemaEventTypeCreateBodyParams.parse(req.body);
  /* Non-admin users can only create event types for themselves */
  if (!isAdmin && body.userId)
    throw new HttpError({
      statusCode: 401,
      message: "ADMIN required for `userId`",
    });
  if (
    body.teamId &&
    !isAdmin &&
    !(await canUserAccessTeamWithRole(req.prisma, req.userId, isAdmin, body.teamId, {
      in: [MembershipRole.OWNER, MembershipRole.ADMIN],
    }))
  )
    throw new HttpError({
      statusCode: 401,
      message: "ADMIN required for `teamId`",
    });
  /* Admin users are required to pass in a userId or teamId */
  if (isAdmin && !body.userId && !body.teamId)
    throw new HttpError({ statusCode: 400, message: "`userId` or `teamId` required" });
}

export default defaultResponder(postHandler);
