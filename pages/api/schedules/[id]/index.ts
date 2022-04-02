import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ScheduleResponse } from "@lib/types";
import { schemaSchedulePublic } from "@lib/validations/schedule";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/schedules/{id}:
 *   get:
 *     summary: Get schedule by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the schedule to delete
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Schedule was not found
 */
export async function scheduleById(req: NextApiRequest, res: NextApiResponse<ScheduleResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const schedule = await prisma.schedule.findUnique({ where: { id: safe.data.id } });
  const data = schemaSchedulePublic.parse(schedule);

  if (schedule) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Schedule was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(scheduleById));
