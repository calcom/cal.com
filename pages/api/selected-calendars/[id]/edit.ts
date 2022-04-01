import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { SelectedCalendarResponse } from "@lib/types";
import {
  schemaSelectedCalendarBodyParams,
  schemaSelectedCalendarPublic,
  withValidSelectedCalendar,
} from "@lib/validations/selected-calendar";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /api/selected-calendars/{id}/edit:
 *   patch:
 *     summary: Edits an existing selectedCalendar
 *     tags:
 *     - selectedCalendars
 *     responses:
 *       201:
 *         description: OK, selectedCalendar edited successfuly
 *         model: SelectedCalendar
 *       400:
 *        description: Bad request. SelectedCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editSelectedCalendar(
  req: NextApiRequest,
  res: NextApiResponse<SelectedCalendarResponse>
) {
  const safeQuery = await schemaQueryIdAsString.safeParse(req.query);
  const safeBody = await schemaSelectedCalendarBodyParams.safeParse(req.body);
  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const [userId, integration, externalId] = safeQuery.data.id.split("_");

  const selectedCalendar = await prisma.selectedCalendar.update({
    where: {
      userId_integration_externalId: {
        userId: parseInt(userId),
        integration: integration,
        externalId: externalId,
      },
    },
    data: safeBody.data,
  });
  const data = schemaSelectedCalendarPublic.parse(selectedCalendar);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdString(withValidSelectedCalendar(editSelectedCalendar))
);
