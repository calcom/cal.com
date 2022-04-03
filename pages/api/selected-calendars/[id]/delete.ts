import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BaseResponse } from "@lib/types";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /api/selected-calendars/{userId}_{teamId}/delete:
 *   delete:
 *     summary: Remove an existing record of a selected calendar
 *     parameters:
 *      - in: path
 *      - name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the user to get the selected calendar of
 *      - name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the team to get the selected calendar of
 *     tags:
 *     - selected-calendars
 *     responses:
 *       201:
 *         description: OK, selected calendar removed successfuly
 *       400:
 *        description: Bad request. selected calendar id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteSelectedCalendar(req: NextApiRequest, res: NextApiResponse<BaseResponse>) {
  const safe = await schemaQueryIdAsString.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query", safe.error);
  const [userId, integration, externalId] = safe.data.id.split("_");
  const data = await prisma.selectedCalendar.delete({
    where: {
      userId_integration_externalId: {
        userId: parseInt(userId),
        integration: integration,
        externalId: externalId,
      },
    },
  });

  if (data)
    res.status(200).json({ message: `SelectedCalendar with id: ${safe.data.id} deleted successfully` });
  else
    (error: Error) =>
      res.status(400).json({
        message: `SelectedCalendar with id: ${safe.data.id} was not able to be processed`,
        error,
      });
}

export default withMiddleware("HTTP_DELETE")(withValidQueryIdString(deleteSelectedCalendar));
