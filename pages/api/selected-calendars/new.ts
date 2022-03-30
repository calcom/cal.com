import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { SelectedCalendarResponse } from "@lib/types";
import {
  schemaSelectedCalendarBodyParams,
  schemaSelectedCalendarPublic,
  withValidSelectedCalendar,
} from "@lib/validations/selected-calendar";

/**
 * @swagger
 * /api/selectedCalendars/new:
 *   post:
 *     description: Creates a new selected calendar
 *     responses:
 *       201:
 *         description: OK, selected calendar created
 *         model: SelectedCalendar
 *       400:
 *        description: Bad request. SelectedCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createSelectedCalendar(req: NextApiRequest, res: NextApiResponse<SelectedCalendarResponse>) {
  const safe = schemaSelectedCalendarBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const selectedCalendar = await prisma.selectedCalendar.create({ data: safe.data });
  const data = schemaSelectedCalendarPublic.parse(selectedCalendar);

  if (data) res.status(201).json({ data, message: "SelectedCalendar created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new selectedCalendar",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidSelectedCalendar(createSelectedCalendar));
