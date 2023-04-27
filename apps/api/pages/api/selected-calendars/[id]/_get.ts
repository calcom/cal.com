import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaSelectedCalendarPublic, selectedCalendarIdSchema } from "~/lib/validations/selected-calendar";

/**
 * @swagger
 * /selected-calendars/{userId}_{integration}_{externalId}:
 *   get:
 *     operationId: getSelectedCalendarById
 *     summary: Find a selected calendar by providing the compoundId(userId_integration_externalId) separated by `_`
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
 *          type: string
 *        required: true
 *        description: externalId of the selected calendar to get
 *      - in: path
 *        name: integration
 *        schema:
 *          type: string
 *        required: true
 *        description: integration of the selected calendar to get
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
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const userId_integration_externalId = selectedCalendarIdSchema.parse(query);
  const data = await prisma.selectedCalendar.findUniqueOrThrow({
    where: { userId_integration_externalId },
  });
  return { selected_calendar: schemaSelectedCalendarPublic.parse(data) };
}

export default defaultResponder(getHandler);
