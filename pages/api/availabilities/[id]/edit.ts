import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { AvailabilityResponse } from "@lib/types";
import {
  schemaAvailabilityBodyParams,
  schemaAvailabilityPublic,
  withValidAvailability,
} from "@lib/validations/availability";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/availabilites/{id}/edit:
 *   patch:
 *     summary: Edit an existing availability
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the availability to edit
 *     tags:
 *     - availabilites
 *     responses:
 *       201:
 *         description: OK, availability edited successfuly
 *         model: Availability
 *       400:
 *        description: Bad request. Availability body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editAvailability(req: NextApiRequest, res: NextApiResponse<AvailabilityResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaAvailabilityBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const availability = await prisma.availability.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaAvailabilityPublic.parse(availability);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidAvailability(editAvailability))
);
