import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DestinationCalendarResponse } from "@lib/types";
import { schemaDestinationCalendarPublic } from "@lib/validations/destination-calendar";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/destination-calendars/{id}:
 *   get:
 *   summary: Get a destinationCalendar by ID
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the destinationCalendar to get
 *     tags:
 *     - destinationCalendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: DestinationCalendar was not found
 */
export async function destinationCalendarById(
  req: NextApiRequest,
  res: NextApiResponse<DestinationCalendarResponse>
) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const destinationCalendar = await prisma.destinationCalendar.findUnique({ where: { id: safe.data.id } });
  const data = schemaDestinationCalendarPublic.parse(destinationCalendar);

  if (destinationCalendar) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "DestinationCalendar was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(destinationCalendarById));
