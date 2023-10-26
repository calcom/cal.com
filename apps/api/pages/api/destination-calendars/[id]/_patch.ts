import type { NextApiRequest } from "next";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import {
  schemaDestinationCalendarEditBodyParams,
  schemaDestinationCalendarReadPublic,
} from "~/lib/validations/destination-calendar";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /destination-calendars/{id}:
 *   patch:
 *     summary: Edit an existing destination calendar
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the destination calendar to edit
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *     requestBody:
 *       description: Create a new booking related to one of your event-types
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               integration:
 *                 type: string
 *                 description: 'The integration'
 *               externalId:
 *                 type: string
 *                 description: 'The external ID of the integration'
 *               eventTypeId:
 *                 type: integer
 *                 description: 'The ID of the eventType it is associated with'
 *               bookingId:
 *                 type: integer
 *                 description: 'The booking ID it is associated with'
 *     tags:
 *      - destination-calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *        description: Destination calendar not found
 */
export async function patchHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const parsedBody = schemaDestinationCalendarEditBodyParams.parse(body);
  let credentialId: number | undefined = undefined;
  const assignedUserId = isAdmin ? parsedBody.userId || userId : userId;

  // when linked with eventTypeId, we need to fetch the userId from the eventTypeId
  if (parsedBody.eventTypeId) {
    const eventType = await prisma.eventType.findFirst({
      where: { id: parsedBody.eventTypeId, userId: assignedUserId },
    });
    if (!eventType)
      throw new HttpError({
        statusCode: 400,
        message: "Bad request, eventTypeId invalid",
      });
    parsedBody.userId = undefined;
  }

  const { userCredentials } = await findUserCredentials(req);

  if (parsedBody.integration && !parsedBody.externalId) {
    throw new HttpError({ statusCode: 400, message: "External Id is required with integration value" });
  }
  if (!parsedBody.integration && parsedBody.externalId) {
    throw new HttpError({ statusCode: 400, message: "Integration value is required with external ID" });
  }

  if (parsedBody.integration && parsedBody.externalId) {
    const calendarCredentials = getCalendarCredentials(userCredentials);

    const { connectedCalendars } = await getConnectedCalendars(
      calendarCredentials,
      [],
      parsedBody.externalId
    );
    const connectedCalendar = connectedCalendars.find(
      (c) =>
        c?.primary?.externalId === parsedBody.externalId && c?.primary?.integration === parsedBody.integration
    );

    if (!connectedCalendar)
      throw new HttpError({
        statusCode: 400,
        message: "Bad request, credential id invalid",
      });

    credentialId = connectedCalendar.primary?.credentialId;
  }

  const destinationCalendar = await prisma.destinationCalendar.update({
    where: { id },
    data: { ...parsedBody, credentialId },
  });
  return { destinationCalendar: schemaDestinationCalendarReadPublic.parse(destinationCalendar) };
}

async function findUserCredentials(req: NextApiRequest) {
  const { userId: requestUserId, prisma, isAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  const body = schemaDestinationCalendarEditBodyParams.parse(req.body);
  const userId = isAdmin ? body.userId || requestUserId : requestUserId;
  const destinationCalendarObject = await prisma.destinationCalendar.findFirst({
    where: {
      id,
    },
    select: { eventTypeId: true, credentialId: true },
  });

  if (!destinationCalendarObject) {
    throw new HttpError({
      statusCode: 404,
      message: `Destination calendar with ID ${id} not found`,
    });
  }

  if (!destinationCalendarObject.credentialId) {
    throw new HttpError({
      statusCode: 404,
      message: `Destination calendar missing credential id`,
    });
  }

  const credentials = await prisma.credential.findMany({
    where: { id: destinationCalendarObject.credentialId, userId },
    select: credentialForCalendarServiceSelect,
  });

  if (!credentials || credentials.length === 0) {
    throw new HttpError({
      statusCode: 400,
      message: `Bad request, no associated credentials found`,
    });
  }

  if (body.eventTypeId) {
    if (destinationCalendarObject.eventTypeId) {
      const userEventType = await prisma.eventType.findFirst({
        where: { id: body.eventTypeId },
        select: { userId: true },
      });

      if (!userEventType || userEventType.userId !== userId) {
        throw new HttpError({
          statusCode: 404,
          message: `Event type with ID ${body.eventTypeId} not found`,
        });
      }
      return { userCredentials: credentials };
    }
    throw new HttpError({
      statusCode: 400,
      message: `The provided destination calendar can not be linked to an event type`,
    });
  }

  if (!body.eventTypeId) {
    if (!destinationCalendarObject.eventTypeId) return { userCredentials: credentials };
    throw new HttpError({
      statusCode: 400,
      message: `The provided destination calendar can only be linked to an event type`,
    });
  }

  return { userCredentials: credentials };
}

export default defaultResponder(patchHandler);
