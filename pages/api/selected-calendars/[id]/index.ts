import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { SelectedCalendarResponse } from "@lib/types";
import { schemaSelectedCalendarPublic } from "@lib/validations/selected-calendar";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/selectedCalendars/:id:
 *   get:
 *     description: find selectedCalendar by ID
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: SelectedCalendar was not found
 */
export async function selectedCalendarById(
  req: NextApiRequest,
  res: NextApiResponse<SelectedCalendarResponse>
) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const selectedCalendar = await prisma.selectedCalendar.findUnique({ where: { id: safe.data.id } });
  const data = schemaSelectedCalendarPublic.parse(selectedCalendar);

  if (selectedCalendar) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "SelectedCalendar was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(selectedCalendarById));
