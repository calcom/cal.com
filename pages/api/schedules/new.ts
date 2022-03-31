import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ScheduleResponse } from "@lib/types";
import { schemaScheduleBodyParams, schemaSchedulePublic, withValidSchedule } from "@lib/validations/schedule";

/**
 * @swagger
 * /api/schedules/new:
 *   post:
 *     summary: Creates a new schedule
 *     tags:
 *     - schedules
 *     responses:
 *       201:
 *         description: OK, schedule created
 *         model: Schedule
 *       400:
 *        description: Bad request. Schedule body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createSchedule(req: NextApiRequest, res: NextApiResponse<ScheduleResponse>) {
  const safe = schemaScheduleBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const schedule = await prisma.schedule.create({ data: safe.data });
  const data = schemaSchedulePublic.parse(schedule);

  if (data) res.status(201).json({ data, message: "Schedule created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new schedule",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidSchedule(createSchedule));
