import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";
import type { z } from "zod";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import type { PrismaClient } from "@calcom/prisma";
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
type DestinationCalendarType = {
  eventTypeId?: number | null;
  credentialId: number | null;
};

type UserCredentialType = {
  id: number;
  appId: string | null;
  type: string;
  userId: number | null;
  user: {
    email: string;
  } | null;
  teamId: number | null;
  key: Prisma.JsonValue;
  invalid: boolean | null;
};

export async function patchHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const parsedBody = schemaDestinationCalendarEditBodyParams.parse(body);
  const assignedUserId = isAdmin ? parsedBody.userId || userId : userId;

  validateIntegrationInput(parsedBody);
  const destinationCalendarObject: DestinationCalendarType = await getDestinationCalendar(id, prisma);
  await validateRequest({ destinationCalendarObject, parsedBody, assignedUserId, prisma });
  if (parsedBody.eventTypeId) parsedBody.userId = undefined;
  const userCredentials = await getUserCredentials({
    credentialId: destinationCalendarObject.credentialId,
    userId,
    prisma,
  });
  const credentialId = await verifyCredentialsAndGetId({
    parsedBody,
    userCredentials,
    destinationCalendarObject,
  });
  const destinationCalendar = await prisma.destinationCalendar.update({
    where: { id },
    data: { ...parsedBody, credentialId },
  });
  return { destinationCalendar: schemaDestinationCalendarReadPublic.parse(destinationCalendar) };
}

async function getUserCredentials({
  credentialId,
  userId,
  prisma,
}: {
  credentialId: number | null;
  userId: number;
  prisma: PrismaClient;
}) {
  if (!credentialId) {
    throw new HttpError({
      statusCode: 404,
      message: `Destination calendar missing credential id`,
    });
  }
  const userCredentials = await prisma.credential.findMany({
    where: { id: credentialId, userId },
    select: credentialForCalendarServiceSelect,
  });

  if (!userCredentials || userCredentials.length === 0) {
    throw new HttpError({
      statusCode: 400,
      message: `Bad request, no associated credentials found`,
    });
  }
  return userCredentials;
}

async function verifyCredentialsAndGetId({
  parsedBody,
  userCredentials,
  destinationCalendarObject,
}: {
  parsedBody: z.infer<typeof schemaDestinationCalendarEditBodyParams>;
  userCredentials: UserCredentialType[];
  destinationCalendarObject: DestinationCalendarType;
}) {
  let credentialId = destinationCalendarObject.credentialId;

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

    credentialId = connectedCalendar.primary?.credentialId || null;
  }
  return credentialId;
}

async function validateRequest({
  destinationCalendarObject,
  parsedBody,
  assignedUserId,
  prisma,
}: {
  destinationCalendarObject: DestinationCalendarType;
  parsedBody: z.infer<typeof schemaDestinationCalendarEditBodyParams>;
  assignedUserId: number;
  prisma: PrismaClient;
}) {
  if (parsedBody.eventTypeId) {
    if (!destinationCalendarObject.eventTypeId) {
      throw new HttpError({
        statusCode: 400,
        message: `The provided destination calendar can not be linked to an event type`,
      });
    }

    const userEventType = await prisma.eventType.findFirst({
      where: { id: parsedBody.eventTypeId },
      select: { userId: true },
    });

    if (!userEventType || userEventType.userId !== assignedUserId) {
      throw new HttpError({
        statusCode: 404,
        message: `Event type with ID ${parsedBody.eventTypeId} not found`,
      });
    }
  }

  // Now we know eventType belongs to this user
  if (!parsedBody.eventTypeId) {
    if (destinationCalendarObject.eventTypeId) {
      throw new HttpError({
        statusCode: 400,
        message: `The provided destination calendar can only be linked to an event type`,
      });
    }
  }
}

async function getDestinationCalendar(id: number, prisma: PrismaClient) {
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

  return destinationCalendarObject;
}

function validateIntegrationInput(parsedBody: z.infer<typeof schemaDestinationCalendarEditBodyParams>) {
  if (parsedBody.integration && !parsedBody.externalId) {
    throw new HttpError({ statusCode: 400, message: "External Id is required with integration value" });
  }
  if (!parsedBody.integration && parsedBody.externalId) {
    throw new HttpError({ statusCode: 400, message: "Integration value is required with external ID" });
  }
}

export default defaultResponder(patchHandler);
