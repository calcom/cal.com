import type { NextApiRequest, NextApiResponse } from "next";

import safeParseJSON from "@lib/helpers/safeParseJSON";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { AvailabilityResponse, AvailabilitiesResponse } from "@lib/types";
import {
  schemaAvailabilityCreateBodyParams,
  schemaAvailabilityReadPublic,
  schemaAvailabilityReadBodyParams,
} from "@lib/validations/availability";

async function createOrlistAllAvailabilities(
  { method, body, userId, isAdmin, prisma }: NextApiRequest,
  res: NextApiResponse<AvailabilitiesResponse | AvailabilityResponse>
) {
  body = safeParseJSON(body);
  if (body.success !== undefined && !body.success) {
    res.status(400).json({ message: body.message });
    return;
  }

  const safe = schemaAvailabilityReadBodyParams.safeParse(body);

  if (!safe.success) {
    return res.status(400).json({ message: "Bad request" });
  }

  const safeBody = safe.data;

  if (safeBody.userId && !isAdmin) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  } else {
    if (method === "GET") {
      /**
       * @swagger
       * /availabilities:
       *   get:
       *     operationId: listAvailabilities
       *     summary: Find all availabilities
       *     tags:
       *     - availabilities
       *     externalDocs:
       *        url: https://docs.cal.com/availability
       *     responses:
       *       200:
       *         description: OK
       *       401:
       *        description: Authorization information is missing or invalid.
       *       404:
       *         description: No availabilities were found
       */
      // const data = await prisma.availability.findMany({ where: { userId } });

      const userIds = Array.isArray(safeBody.userId) ? safeBody.userId : [safeBody.userId || userId];

      const schedules = await prisma.schedule.findMany({
        where: {
          userId: { in: userIds },
          availability: { some: {} },
        },
        select: {
          availability: true,
          userId: true,
        },
        ...(Array.isArray(body.userId) && { orderBy: { userId: "asc" } }),
      });

      const availabilities = schedules.flatMap((schedule) => {
        return { ...schedule.availability[0], userId: schedule.userId };
      });

      if (availabilities) res.status(200).json({ availabilities });
      else
        (error: Error) =>
          res.status(404).json({
            message: "No Availabilities were found",
            error,
          });
    } else if (method === "POST") {
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
      const safe = schemaAvailabilityCreateBodyParams.safeParse(body);
      if (!safe.success) {
        res.status(400).json({ message: "Your request is invalid", error: safe.error });
        return;
      }
      // FIXME: check for eventTypeId ad scheduleId ownership if passed

      const data = await prisma.availability.create({ data: { ...safe.data, userId } });
      const availability = schemaAvailabilityReadPublic.parse(data);

      if (availability) res.status(201).json({ availability, message: "Availability created successfully" });
      else
        (error: Error) =>
          res.status(400).json({
            message: "Could not create new availability",
            error,
          });
    } else res.status(405).json({ message: `Method ${method} not allowed` });
  }
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllAvailabilities);
