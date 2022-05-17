import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { ScheduleResponse, SchedulesResponse } from "@lib/types";
import { schemaScheduleBodyParams, schemaSchedulePublic } from "@lib/validations/schedule";

async function createOrlistAllSchedules(
  { method, body, userId }: NextApiRequest,
  res: NextApiResponse<SchedulesResponse | ScheduleResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /schedules:
     *   get:
     *     operationId: listSchedules
     *     summary: Find all schedules
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
    const data = await prisma.schedule.findMany({ where: { userId } });
    const schedules = data.map((schedule) => schemaSchedulePublic.parse(schedule));
    if (schedules) res.status(200).json({ schedules });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Schedules were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /schedules:
     *   post:
     *     operationId: addSchedule
     *     summary: Creates a new schedule
     *     tags:
     *     - schedules
     *     responses:
     *       201:
     *         description: OK, schedule created
     *       400:
     *        description: Bad request. Schedule body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaScheduleBodyParams.safeParse(body);
    if (!safe.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }
    const data = await prisma.schedule.create({ data: { ...safe.data, userId } });
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

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllSchedules);
