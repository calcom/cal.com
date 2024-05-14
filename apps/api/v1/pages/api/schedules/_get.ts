import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";
import { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { schemaSchedulePublic } from "~/lib/validations/schedule";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

export const schemaUserIds = z
  .union([z.string(), z.array(z.string())])
  .transform((val) => (Array.isArray(val) ? val.map((v) => parseInt(v, 10)) : [parseInt(val, 10)]));

/**
 * @swagger
 * /schedules:
 *   get:
 *     operationId: listSchedules
 *     summary: Find all schedules
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             examples:
 *               schedules:
 *                 value:
 *                   {
 *                     "schedules": [
 *                       {
 *                         "id": 1234,
 *                         "userId": 5678,
 *                         "name": "Sample Schedule 1",
 *                         "timeZone": "America/Chicago",
 *                         "availability": [
 *                           {
 *                             "id": 987,
 *                             "eventTypeId": null,
 *                             "days": [1, 2, 3, 4, 5],
 *                             "startTime": "09:00:00",
 *                             "endTime": "23:00:00"
 *                           }
 *                         ]
 *                       },
 *                       {
 *                         "id": 2345,
 *                         "userId": 6789,
 *                         "name": "Sample Schedule 2",
 *                         "timeZone": "Europe/Amsterdam",
 *                         "availability": [
 *                           {
 *                             "id": 876,
 *                             "eventTypeId": null,
 *                             "days": [1, 2, 3, 4, 5],
 *                             "startTime": "09:00:00",
 *                             "endTime": "17:00:00"
 *                           }
 *                         ]
 *                       }
 *                     ]
 *                   }
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No schedules were found
 */

async function handler(req: NextApiRequest) {
  const { userId, isAdmin } = req;
  const args: Prisma.ScheduleFindManyArgs = isAdmin ? {} : { where: { userId } };
  args.include = { availability: true };

  if (!isAdmin && req.query.userId)
    throw new HttpError({
      statusCode: 401,
      message: "Unauthorized: Only admins can query other users",
    });

  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    args.where = { userId: { in: userIds } };
    if (Array.isArray(query.userId)) args.orderBy = { userId: "asc" };
  }
  const data = await prisma.schedule.findMany(args);
  return { schedules: data.map((s) => schemaSchedulePublic.parse(s)) };
}

export default defaultResponder(handler);
