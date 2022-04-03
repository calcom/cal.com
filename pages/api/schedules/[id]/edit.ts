import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ScheduleResponse } from "@lib/types";
import { schemaScheduleBodyParams, schemaSchedulePublic, withValidSchedule } from "@lib/validations/schedule";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/schedules/{id}/edit:
 *   patch:
 *     summary: Edits an existing schedule
 *     tags:
 *     - schedules
 *     responses:
 *       201:
 *         description: OK, schedule edited successfuly
 *         model: Schedule
 *       400:
 *        description: Bad request. Schedule body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editSchedule(req: NextApiRequest, res: NextApiResponse<ScheduleResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaScheduleBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const schedule = await prisma.schedule.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaSchedulePublic.parse(schedule);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidSchedule(editSchedule))
);
