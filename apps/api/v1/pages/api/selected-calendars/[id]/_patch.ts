import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { UpdateArguments } from "@calcom/lib/server/repository/selectedCalendar";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import {
  schemaSelectedCalendarPublic,
  schemaSelectedCalendarUpdateBodyParams,
  selectedCalendarIdSchema,
} from "~/lib/validations/selected-calendar";

/**
 * @swagger
 * /selected-calendars/{userId}_{integration}_{externalId}:
 *   patch:
 *     operationId: editSelectedCalendarById
 *     summary: Edit a selected calendar
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
 *       201:
 *         description: OK, selected-calendar edited successfully
 *       400:
 *        description: Bad request. SelectedCalendar body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { query, isSystemWideAdmin } = req;
  const userId_integration_externalId = selectedCalendarIdSchema.parse(query);
  const { userId: bodyUserId, ...data } = schemaSelectedCalendarUpdateBodyParams.parse(req.body);
  const args: UpdateArguments = { where: { ...userId_integration_externalId }, data };

  if (!isSystemWideAdmin && bodyUserId)
    throw new HttpError({ statusCode: 403, message: `ADMIN required for userId` });

  if (isSystemWideAdmin && bodyUserId) {
    const where: Prisma.UserWhereInput = { id: bodyUserId };
    await prisma.user.findFirstOrThrow({ where });
    args.data.userId = bodyUserId;
  }

  const result = await SelectedCalendarRepository.updateUserLevel(args);
  return { selected_calendar: schemaSelectedCalendarPublic.parse(result) };
}

export default defaultResponder(patchHandler);
