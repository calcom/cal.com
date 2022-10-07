import type { NextApiRequest, NextApiResponse } from "next";

import { getAvailabilityFromSchedule, DEFAULT_SCHEDULE } from "@calcom/lib/availability";

import safeParseJSON from "@lib/helpers/safeParseJSON";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { ScheduleResponse, SchedulesResponse } from "@lib/types";
import {
  schemaScheduleBodyParams,
  schemaSchedulePublic,
  schemaCreateScheduleBodyParams,
} from "@lib/validations/schedule";

async function createOrlistAllSchedules(
  { method, body, userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<SchedulesResponse | ScheduleResponse>
) {
  body = safeParseJSON(body);
  if (body.success !== undefined && !body.success) {
    res.status(400).json({ message: body.message });
    return;
  }

  const safe = schemaScheduleBodyParams.safeParse(body);

  if (!safe.success) {
    res.status(400).json({ message: "Bad request" });
    return;
  }

  const safeBody = safe.data;

  if (safeBody.userId && !isAdmin) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  } else {
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

      const userIds = Array.isArray(safeBody.userId) ? safeBody.userId : [safeBody.userId || userId];

      const data = await prisma.schedule.findMany({
        where: {
          userId: { in: userIds },
        },
        include: { availability: true },
        ...(Array.isArray(body.userId) && { orderBy: { userId: "asc" } }),
      });
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
      const safe = schemaCreateScheduleBodyParams.safeParse(body);
      if (body.userId && !isAdmin) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (!safe.success) {
        res.status(400).json({ message: "Invalid request body" });
        return;
      }

      const data = await prisma.schedule.create({
        data: {
          ...safe.data,
          userId: safe.data.userId || userId,
          availability: {
            createMany: {
              data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE).map((schedule) => ({
                days: schedule.days,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              })),
            },
          },
        },
      });
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
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllSchedules);
