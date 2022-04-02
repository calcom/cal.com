import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { SchedulesResponse } from "@lib/types";
import { schemaSchedulePublic } from "@lib/validations/schedule";

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: Returns all schedules
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No schedules were found
 */
async function allSchedules(_: NextApiRequest, res: NextApiResponse<SchedulesResponse>) {
  const schedules = await prisma.schedule.findMany();
  const data = schedules.map((schedule) => schemaSchedulePublic.parse(schedule));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Schedules were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allSchedules);
