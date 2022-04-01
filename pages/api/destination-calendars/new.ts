import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { DestinationCalendarResponse } from "@lib/types";
import {
  schemaDestinationCalendarBodyParams,
  schemaDestinationCalendarPublic,
  withValidDestinationCalendar,
} from "@lib/validations/destination-calendar";

/**
 * @swagger
 * /api/destination-calendars/new:
 *   post:
 *     summary: Creates a new destinationCalendar
 *   requestBody:
 *     description: Optional description in *Markdown*
 *     required: true
 *     content:
 *       application/json:
 *           schema:
 *           $ref: '#/components/schemas/DestinationCalendar'
 *     tags:
 *     - destinationCalendars
 *     responses:
 *       201:
 *         description: OK, destinationCalendar created
 *         model: DestinationCalendar
 *       400:
 *        description: Bad request. DestinationCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createDestinationCalendar(
  req: NextApiRequest,
  res: NextApiResponse<DestinationCalendarResponse>
) {
  const safe = schemaDestinationCalendarBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const destinationCalendar = await prisma.destinationCalendar.create({ data: safe.data });
  const data = schemaDestinationCalendarPublic.parse(destinationCalendar);

  if (data) res.status(201).json({ data, message: "DestinationCalendar created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new destinationCalendar",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidDestinationCalendar(createDestinationCalendar));
