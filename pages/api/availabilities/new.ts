import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AvailabilityResponse } from "@lib/types";
import {
  schemaAvailabilityBodyParams,
  schemaAvailabilityPublic,
  withValidAvailability,
} from "@lib/validations/availability";

/**
 * @swagger
 * /api/availabilities/new:
 *   post:
 *     summary: Creates a new availability
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *           $ref: '#/components/schemas/Availability'
 *     tags:
 *     - availabilities
 *     responses:
 *       201:
 *         description: OK, availability created
 *       400:
 *        description: Bad request. Availability body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createAvailability(req: NextApiRequest, res: NextApiResponse<AvailabilityResponse>) {
  const safe = schemaAvailabilityBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const availability = await prisma.availability.create({ data: safe.data });
  const data = schemaAvailabilityPublic.parse(availability);

  if (data) res.status(201).json({ data, message: "Availability created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new availability",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidAvailability(createAvailability));
