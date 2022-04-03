import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { SelectedCalendarResponse } from "@lib/types";
import { schemaSelectedCalendarPublic } from "@lib/validations/selected-calendar";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /api/selected-calendars/{userId}_{teamId}:
 *   get:
 *     summary: find selectedCalendar by userID and teamID
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric userId of the selectedCalendar to get
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric teamId of the selectedCalendar to get
 *     tags:
 *     - selected-calendars
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
  const safe = await schemaQueryIdAsString.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");
  const [userId, integration, externalId] = safe.data.id.split("_");

  const selectedCalendar = await prisma.selectedCalendar.findUnique({
    where: {
      userId_integration_externalId: {
        userId: parseInt(userId),
        integration: integration,
        externalId: externalId,
      },
    },
  });
  const data = schemaSelectedCalendarPublic.parse(selectedCalendar);

  if (selectedCalendar) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "SelectedCalendar was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdString(selectedCalendarById));
