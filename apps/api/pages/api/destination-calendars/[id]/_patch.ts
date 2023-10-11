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
 *       201:
 *         description: OK, destinationCalendar edited successfully
 *       400:
 *        description: Bad request. DestinationCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const parsedBody = schemaDestinationCalendarEditBodyParams.parse(body);

  await checkPermissions(req);

  const destinationCalendar = await prisma.destinationCalendar.update({
    where: { id },
    data: parsedBody,
  });
  return { destinationCalendar: schemaDestinationCalendarReadPublic.parse(destinationCalendar) };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, prisma, isAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isAdmin) return;
  const userEventTypes = await prisma.eventType.findMany({
    where: { userId },
    select: { id: true },
  });

  const userEventTypeIds = userEventTypes.map((eventType) => eventType.id);

  const destinationCalendar = await prisma.destinationCalendar.findFirst({
    where: {
      AND: [
        { id },
        {
          OR: [{ userId }, { eventTypeId: { in: userEventTypeIds } }],
        },
      ],
    },
  });
  if (!destinationCalendar) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default defaultResponder(patchHandler);
