import type { NextApiRequest } from "next";
import type { z } from "zod";

import {
  getCalendarCredentialsWithoutDelegation,
  getConnectedCalendars,
} from "@calcom/features/calendars/lib/CalendarManager";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
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
  userId?: number | null;
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
  encryptedKey: string | null;
};

export async function patchHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const parsedBody = schemaDestinationCalendarEditBodyParams.parse(body);
  const assignedUserId = isSystemWideAdmin ? parsedBody.userId || userId : userId;

  validateIntegrationInput(parsedBody);
  const destinationCalendarObject: DestinationCalendarType = await getDestinationCalendar(id, prisma);
  await validateRequestAndOwnership({ destinationCalendarObject, parsedBody, assignedUserId, prisma });

  const userCredentials = await getUserCredentials({
    credentialId: destinationCalendarObject.credentialId,
    userId: assignedUserId,
    prisma,
  });
  const credentialId = await verifyCredentialsAndGetId({
    parsedBody,
    userCredentials,
    currentCredentialId: destinationCalendarObject.credentialId,
  });
  // If the user has passed eventTypeId, we need to remove userId from the update data to make sure we don't link it to user as well
  if (parsedBody.eventTypeId) parsedBody.userId = undefined;
  const destinationCalendar = await prisma.destinationCalendar.update({
    where: { id },
    data: { ...parsedBody, credentialId },
  });
  return { destinationCalendar: schemaDestinationCalendarReadPublic.parse(destinationCalendar) };
}

/**
 * Retrieves user credentials associated with a given credential ID and user ID and validates if the credentials belong to this user
 *
 * @param credentialId - The ID of the credential to fetch. If not provided, an error is thrown.
 * @param userId - The user ID against which the credentials need to be verified.
 * @param prisma - An instance of PrismaClient for database operations.
 *
 * @returns - An array containing the matching user credentials.
 *
 * @throws HttpError - If `credentialId` is not provided or no associated credentials are found in the database.
 */
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

/**
 * Verifies the provided credentials and retrieves the associated credential ID.
 *
 * This function checks if the `integration` and `externalId` properties from the parsed body are present.
 * If both properties exist, it fetches the connected calendar credentials using the provided user credentials
 * and checks for a matching external ID and integration from the list of connected calendars.
 *
 * If a match is found, it updates the `credentialId` with the one from the connected calendar.
 * Otherwise, it throws an HTTP error with a 400 status indicating an invalid credential ID.
 *
 * If the parsed body does not contain the necessary properties, the function
 * returns the `credentialId` from the destination calendar object.
 *
 * @param parsedBody - The parsed body from the incoming request, validated against a predefined schema.
 *                     Checked if it contain properties like `integration` and `externalId`.
 * @param userCredentials - An array of user credentials used to fetch the connected calendar credentials.
 * @param destinationCalendarObject - An object representing the destination calendar. Primarily used
 *                                    to fetch the default `credentialId`.
 *
 * @returns - The verified `credentialId` either from the matched connected calendar in case of updating the destination calendar,
 *            or the provided destination calendar object in other cases.
 *
 * @throws HttpError - If no matching connected calendar is found for the given `integration` and `externalId`.
 */
async function verifyCredentialsAndGetId({
  parsedBody,
  userCredentials,
  currentCredentialId,
}: {
  parsedBody: z.infer<typeof schemaDestinationCalendarEditBodyParams>;
  userCredentials: UserCredentialType[];
  currentCredentialId: number | null;
}) {
  if (parsedBody.integration && parsedBody.externalId) {
    const calendarCredentials = getCalendarCredentialsWithoutDelegation(
      userCredentials.map((cred) => ({
        ...cred,
        delegationCredentialId: null,
      }))
    );

    const { connectedCalendars } = await getConnectedCalendars(
      calendarCredentials,
      [],
      parsedBody.externalId
    );
    const eligibleCalendars = connectedCalendars[0]?.calendars?.filter((calendar) => !calendar.readOnly);
    const calendar = eligibleCalendars?.find(
      (c) => c.externalId === parsedBody.externalId && c.integration === parsedBody.integration
    );

    if (!calendar?.credentialId)
      throw new HttpError({
        statusCode: 400,
        message: "Bad request, credential id invalid",
      });
    return calendar?.credentialId;
  }
  return currentCredentialId;
}

/**
 * Validates the request for updating a destination calendar.
 *
 * This function checks the validity of the provided eventTypeId against the existing destination calendar object
 * in the sense that if the destination calendar is not linked to an event type, the eventTypeId can not be provided.
 *
 * It also ensures that the eventTypeId, if provided, belongs to the assigned user.
 *
 * @param destinationCalendarObject - An object representing the destination calendar.
 * @param parsedBody - The parsed body from the incoming request, validated against a predefined schema.
 * @param assignedUserId - The user ID assigned for the operation, which might be an admin or a regular user.
 * @param prisma - An instance of PrismaClient for database operations.
 *
 * @throws HttpError - If the validation fails or inconsistencies are detected in the request data.
 */
async function validateRequestAndOwnership({
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

  if (!parsedBody.eventTypeId) {
    if (destinationCalendarObject.eventTypeId) {
      throw new HttpError({
        statusCode: 400,
        message: `The provided destination calendar can only be linked to an event type`,
      });
    }
    if (destinationCalendarObject.userId !== assignedUserId) {
      throw new HttpError({
        statusCode: 403,
        message: `Forbidden`,
      });
    }
  }
}

/**
 * Fetches the destination calendar based on the provided ID as the path parameter, specifically `credentialId` and `eventTypeId`.
 *
 * If no matching destination calendar is found for the provided ID, an HTTP error with a 404 status
 * indicating that the desired destination calendar was not found is thrown.
 *
 * @param id - The ID of the destination calendar to be retrieved.
 * @param prisma - An instance of PrismaClient for database operations.
 *
 * @returns - An object containing details of the matching destination calendar, specifically `credentialId` and `eventTypeId`.
 *
 * @throws HttpError - If no destination calendar matches the provided ID.
 */
async function getDestinationCalendar(id: number, prisma: PrismaClient) {
  const destinationCalendarObject = await prisma.destinationCalendar.findFirst({
    where: {
      id,
    },
    select: { userId: true, eventTypeId: true, credentialId: true },
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
