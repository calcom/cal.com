import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

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

  const assignedUserId = isAdmin ? parsedBody.userId || userId : userId;

  if (parsedBody.integration && !parsedBody.externalId) {
    throw new HttpError({ statusCode: 400, message: "External Id is required with integration value" });
  }
  if (!parsedBody.integration && parsedBody.externalId) {
    throw new HttpError({ statusCode: 400, message: "Integration value is required with external ID" });
  }

  if (parsedBody.integration && parsedBody.externalId) {
    /* Check if credentialId data matches the ownership and integration passed in */
    const credential = await prisma.credential.findFirst({
      where: { type: parsedBody.integration, userId: assignedUserId },
      select: { id: true, type: true, userId: true },
    });
    if (!credential)
      throw new HttpError({
        statusCode: 400,
        message: "Bad request, invalid externalId or integration value",
      });
  }

  const destinationCalendar = await prisma.destinationCalendar.update({
    where: { id },
    data: parsedBody,
  });
  return { destinationCalendar: schemaDestinationCalendarReadPublic.parse(destinationCalendar) };
}

export default defaultResponder(patchHandler);
