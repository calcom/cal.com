import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { SelectedCalendarResponse, SelectedCalendarsResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import {
  schemaSelectedCalendarBodyParams,
  schemaSelectedCalendarPublic,
} from "@lib/validations/selected-calendar";

/**
 * @swagger
 * /v1/selected-calendars:
 *   get:
 *     summary: Get all selected calendars
 *     security:
 *       - ApiKeyAuth: []
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
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - selected-calendars
 *     responses:
 *       201:
 *         description: OK, selected calendar created
 *         model: SelectedCalendar
 *       400:
 *        description: Bad request. SelectedCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllSelectedCalendars(
  req: NextApiRequest,
  res: NextApiResponse<SelectedCalendarsResponse | SelectedCalendarResponse>
) {
  const { method } = req;
  const userId = getCalcomUserId(res);

  if (method === "GET") {
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
