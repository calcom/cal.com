import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { SelectedCalendarResponse, SelectedCalendarsResponse } from "@lib/types";
import {
  schemaSelectedCalendarBodyParams,
  schemaSelectedCalendarPublic,
} from "@lib/validations/selected-calendar";

async function createOrlistAllSelectedCalendars(
  { method, userId }: NextApiRequest,
  res: NextApiResponse<SelectedCalendarsResponse | SelectedCalendarResponse>
) {
  if (method === "GET") {
    /**
     * @swagger
     * /selected-calendars:
     *   get:
     *     summary: Find all selected calendars
     *     tags:
     *     - selected-calendars
     *     responses:
     *       200:
     *         description: OK
     *       401:
     *        description: Authorization information is missing or invalid.
     *       404:
     *         description: No selected calendars were found
     */
    const data = await prisma.selectedCalendar.findMany({ where: { userId } });
    const selected_calendars = data.map((selected_calendar) =>
      schemaSelectedCalendarPublic.parse(selected_calendar)
    );
    if (selected_calendars) res.status(200).json({ selected_calendars });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No SelectedCalendars were found",
          error,
        });
  } else if (method === "POST") {
    /**
     * @swagger
     * /selected-calendars:
     *   get:
     *     summary: Find all selected calendars
     *     tags:
     *     - selected-calendars
     *     responses:
     *       200:
     *         description: OK
     *       401:
     *        description: Authorization information is missing or invalid.
     *       404:
     *         description: No selected calendars were found
     *   post:
     *     summary: Creates a new selected calendar
     *     tags:
     *     - selected-calendars
     *     responses:
     *       201:
     *         description: OK, selected calendar created
     *       400:
     *        description: Bad request. SelectedCalendar body is invalid.
     *       401:
     *        description: Authorization information is missing or invalid.
     */
    const safe = schemaSelectedCalendarBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");
    // Create new selectedCalendar connecting it to current userId
    const data = await prisma.selectedCalendar.create({
      data: { ...safe.data, user: { connect: { id: userId } } },
    });
    const selected_calendar = schemaSelectedCalendarPublic.parse(data);

    if (selected_calendar)
      res.status(201).json({ selected_calendar, message: "SelectedCalendar created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new selected calendar",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllSelectedCalendars);
