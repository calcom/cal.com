import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import {
  schemaAvailabilityCreateBodyParams,
  schemaAvailabilityReadPublic,
} from "@lib/validations/availability";

/**
 * @swagger
 * /availabilities:
 *   post:
 *     operationId: addAvailability
 *     summary: Creates a new availability
 *     requestBody:
 *       description: Edit an existing availability related to one of your bookings
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *              - scheduleId
 *              - startTime
 *              - endTime
 *             properties:
 *               days:
 *                 type: array
 *                 example: email@example.com
 *               startTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *               endTime:
 *                 type: string
 *                 example: 1970-01-01T17:00:00.000Z
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       201:
 *         description: OK, availability created
 *       400:
 *        description: Bad request. Availability body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { prisma } = req;
  const data = schemaAvailabilityCreateBodyParams.parse(req.body);
  await checkPermissions(req);
  const availability = await prisma.availability.create({
    data,
    include: { Schedule: { select: { userId: true } } },
  });
  req.statusCode = 201;
  return {
    availability: schemaAvailabilityReadPublic.parse(availability),
    message: "Availability created successfully",
  };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, prisma, isAdmin } = req;
  if (isAdmin) return;
  const data = schemaAvailabilityCreateBodyParams.parse(req.body);
  const schedule = await prisma.schedule.findFirst({
    where: { userId, id: data.scheduleId },
  });
  if (!schedule)
    throw new HttpError({ statusCode: 401, message: "You can't add availabilities to this schedule" });
}

export default defaultResponder(postHandler);
