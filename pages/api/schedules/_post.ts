import { HttpError } from "@/../../packages/lib/http-error";
import type { NextApiRequest } from "next";

import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { defaultResponder } from "@calcom/lib/server";

import { schemaCreateScheduleBodyParams, schemaSchedulePublic } from "@lib/validations/schedule";

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
async function postHandler({ body, userId, isAdmin, prisma }: NextApiRequest) {
  const parsedBody = schemaCreateScheduleBodyParams.parse(body);
  if (parsedBody.userId && !isAdmin) {
    throw new HttpError({ statusCode: 403 });
  }

  const data = await prisma.schedule.create({
    data: {
      ...parsedBody,
      userId: parsedBody.userId || userId,
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

  const createSchedule = schemaSchedulePublic.safeParse(data);
  if (!createSchedule.success) {
    throw new HttpError({ statusCode: 400, message: "Could not create new schedule" });
  }

  return {
    schedule: createSchedule.data,
    message: "Schedule created succesfully",
  };
}

export default defaultResponder(postHandler);
