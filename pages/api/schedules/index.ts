import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { ScheduleResponse, SchedulesResponse } from "@lib/types";
import { schemaScheduleBodyParams, schemaSchedulePublic, withValidSchedule } from "@lib/validations/schedule";

/**
 * @swagger
 * /v1/schedules:
 *   get:
 *     summary: Get all schedules
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No schedules were found
 *   post:
 *     summary: Creates a new schedule
 *     security:
 *       - ApiKeyAuth: []
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
async function createOrlistAllSchedules(
  req: NextApiRequest,
  res: NextApiResponse<SchedulesResponse | ScheduleResponse>
) {
  const { method } = req;
  if (method === "GET") {
    const data = await prisma.schedule.findMany();
    const schedules = data.map((schedule) => schemaSchedulePublic.parse(schedule));
    if (schedules) res.status(200).json({ schedules });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Schedules were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaScheduleBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.schedule.create({ data: safe.data });
    const schedule = schemaSchedulePublic.parse(data);

    if (schedule) res.status(201).json({ schedule, message: "Schedule created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new schedule",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(withValidSchedule(createOrlistAllSchedules));
