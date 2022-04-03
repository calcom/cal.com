import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AvailabilityResponse } from "@lib/types";
import { schemaAvailabilityPublic } from "@lib/validations/availability";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/availabilites/{id}:
 *   get:
 *     summary: Get a availability by ID
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the availability to get
 *     tags:
 *     - availabilites
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Availability was not found
 */
export async function availabilityById(req: NextApiRequest, res: NextApiResponse<AvailabilityResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const availability = await prisma.availability.findUnique({ where: { id: safe.data.id } });
  const data = schemaAvailabilityPublic.parse(availability);

  if (availability) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Availability was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(availabilityById));
