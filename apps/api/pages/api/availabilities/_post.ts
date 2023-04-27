import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import {
  schemaAvailabilityCreateBodyParams,
  schemaAvailabilityReadPublic,
} from "~/lib/validations/availability";

/**
 * @swagger
 * /availabilities:
 *   post:
 *     operationId: addAvailability
 *     summary: Creates a new availability
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
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
 *                 description: Array of integers depicting weekdays
 *                 items:
 *                   type: integer
 *                   enum: [0, 1, 2, 3, 4, 5]
 *               scheduleId:
 *                 type: integer
 *                 description: ID of schedule this availability is associated with
 *               startTime:
 *                 type: string
 *                 description: Start time of the availability
 *               endTime:
 *                 type: string
 *                 description: End time of the availability
 *           examples:
 *              availability:
 *                summary: An example of availability
 *                value:
 *                  scheduleId: 123
 *                  days: [1,2,3,5]
 *                  startTime: 1970-01-01T17:00:00.000Z
 *                  endTime: 1970-01-01T17:00:00.000Z
 *
 *
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
