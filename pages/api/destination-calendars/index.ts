import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { DestinationCalendarsResponse } from "@lib/types";
import { schemaDestinationCalendarPublic } from "@lib/validations/destination-calendar";

/**
 * @swagger
 * /api/destination-calendars:
 *   get:
 *     summary: Get all destinationCalendars
 *     tags:
 *     - destinationCalendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No destinationCalendars were found
 */
async function allDestinationCalendars(
  _: NextApiRequest,
  res: NextApiResponse<DestinationCalendarsResponse>
) {
  const destinationCalendars = await prisma.destinationCalendar.findMany();
  const data = destinationCalendars.map((destinationCalendar) =>
    schemaDestinationCalendarPublic.parse(destinationCalendar)
  );

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No DestinationCalendars were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allDestinationCalendars);
