import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { selectedCalendarIdSchema } from "~/lib/validations/selected-calendar";

/**
 * @swagger
 * /selected-calendars/{userId}_{integration}_{externalId}:
 *   delete:
 *     operationId: removeSelectedCalendarById
 *     summary: Remove a selected calendar
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: userId of the selected calendar to get
 *      - in: path
 *        name: externalId
 *        schema:
 *          type: integer
 *        required: true
 *        description: externalId of the selected-calendar to get
 *      - in: path
 *        name: integration
 *        schema:
 *          type: string
 *        required: true
 *        description: integration of the selected calendar to get
 *     tags:
 *     - selected-calendars
 *     responses:
 *       201:
 *         description: OK, selected-calendar removed successfully
 *       400:
 *        description: Bad request. SelectedCalendar id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const userId_integration_externalId = selectedCalendarIdSchema.parse(query);
  await SelectedCalendarRepository.deleteUserLevel({
    where: userId_integration_externalId,
  });
  return { message: `Selected Calendar with id: ${query.id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
