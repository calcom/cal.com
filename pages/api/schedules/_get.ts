import type { NextApiRequest } from "next";
import { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaSchedulePublic } from "@lib/validations/schedule";

export const schemaUserIds = z
  .union([z.string(), z.array(z.string())])
  .transform((val) => (Array.isArray(val) ? val.map((v) => parseInt(v, 10)) : [parseInt(val, 10)]));

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
async function handler({ body, prisma, userId, isAdmin, query }: NextApiRequest) {
  let userIds: number[] = [userId];

  if (!isAdmin && query.userId) {
    // throw 403 Forbidden when the userId is given but user is not an admin
    throw new HttpError({ statusCode: 403 });
  }
  // When isAdmin && userId is given parse it and use it instead of the current (admin) user.
  else if (query.userId) {
    const result = schemaUserIds.safeParse(query.userId);
    if (result.success && result.data) {
      userIds = result.data;
    }
  }

  const data = await prisma.schedule.findMany({
    where: {
      userId: { in: userIds },
    },
    include: { availability: true },
    ...(Array.isArray(body.userId) && { orderBy: { userId: "asc" } }),
  });
  const schedules = data.map((schedule) => schemaSchedulePublic.parse(schedule));
  if (schedules) {
    return { schedules };
  }

  throw new HttpError({ statusCode: 404, message: "No schedules were found" });
}

export default defaultResponder(handler);
