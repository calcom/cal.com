import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaSchedulePublic } from "~/lib/validations/schedule";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /schedules/{id}:
 *   get:
 *     operationId: getScheduleById
 *     summary: Find a schedule
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the schedule to get
 *       - in: query
 *         name: apiKey
 *         schema:
 *           type: string
 *         required: true
 *         description: Your API Key
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             examples:
 *               schedule:
 *                 value:
 *                   {
 *                     "schedule": {
 *                       "id": 12345,
 *                       "userId": 182,
 *                       "name": "Sample Schedule",
 *                       "timeZone": "Asia/Calcutta",
 *                       "availability": [
 *                         {
 *                           "id": 111,
 *                           "eventTypeId": null,
 *                           "days": [0, 1, 2, 3, 4, 6],
 *                           "startTime": "00:00:00",
 *                           "endTime": "23:45:00"
 *                         },
 *                         {
 *                           "id": 112,
 *                           "eventTypeId": null,
 *                           "days": [5],
 *                           "startTime": "00:00:00",
 *                           "endTime": "12:00:00"
 *                         },
 *                         {
 *                           "id": 113,
 *                           "eventTypeId": null,
 *                           "days": [5],
 *                           "startTime": "15:00:00",
 *                           "endTime": "23:45:00"
 *                         }
 *                       ]
 *                     }
 *                   }
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Schedule was not found
 */

export async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = await prisma.schedule.findUniqueOrThrow({
    where: { id },
    // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
    include: { availability: true },
  });
  return { schedule: schemaSchedulePublic.parse(data) };
}

export default defaultResponder(getHandler);
