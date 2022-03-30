import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { SelectedCalendarsResponse } from "@lib/types";
import { schemaSelectedCalendarPublic } from "@lib/validations/selected-calendar";

/**
 * @swagger
 * /api/selectedCalendars:
 *   get:
 *     description: Returns all selected calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No selectedCalendars were found
 */
async function allSelectedCalendars(_: NextApiRequest, res: NextApiResponse<SelectedCalendarsResponse>) {
  const selectedCalendars = await prisma.selectedCalendar.findMany();
  const data = selectedCalendars.map((selectedCalendar) =>
    schemaSelectedCalendarPublic.parse(selectedCalendar)
  );

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No SelectedCalendars were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allSelectedCalendars);
