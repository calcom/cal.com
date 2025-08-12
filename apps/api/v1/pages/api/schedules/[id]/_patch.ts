import type { NextApiRequest } from "next";
import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaSchedulePublic, schemaSingleScheduleBodyParams } from "~/lib/validations/schedule";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /schedules/{id}:
 *   patch:
 *     operationId: editScheduleById
 *     summary: Edit an existing schedule
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the schedule to edit
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *     requestBody:
 *       description: Edit an existing schedule
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the schedule
 *               timeZone:
 *                 type: string
 *                 description: The timezone for this schedule
 *           examples:
 *             schedule:
 *               value:
 *                 {
 *                   "name": "Updated Schedule",
 *                   "timeZone": "Asia/Calcutta"
 *                 }
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK, schedule edited successfully
 *         content:
 *           application/json:
 *             examples:
 *               schedule:
 *                 value:
 *                   {
 *                     "schedule": {
 *                       "id": 12345,
 *                       "userId": 1,
 *                       "name": "Total Testing Part 2",
 *                       "timeZone": "Asia/Calcutta",
 *                       "availability": [
 *                         {
 *                           "id": 4567,
 *                           "eventTypeId": null,
 *                           "days": [1, 2, 3, 4, 5],
 *                           "startTime": "09:00:00",
 *                           "endTime": "17:00:00"
 *                         }
 *                       ]
 *                     }
 *                   }
 *       400:
 *        description: Bad request. Schedule body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */

export async function patchHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaSingleScheduleBodyParams.parse(req.body);
  await checkPermissions(req, data);
  const result = await prisma.schedule.update({ where: { id }, data, include: { availability: true } });
  return { schedule: schemaSchedulePublic.parse(result) };
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaSingleScheduleBodyParams>) {
  const { isSystemWideAdmin } = req;
  if (isSystemWideAdmin) return;
  if (body.userId) {
    throw new HttpError({ statusCode: 403, message: "Non admin cannot change the owner of a schedule" });
  }
  //_auth-middleware takes care of verifying the ownership of schedule.
}

export default defaultResponder(patchHandler);
