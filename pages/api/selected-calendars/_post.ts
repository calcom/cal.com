import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import {
  schemaSelectedCalendarBodyParams,
  schemaSelectedCalendarPublic,
} from "@lib/validations/selected-calendar";

/**
 * @swagger
 * /selected-calendars:
 *   get:
 *     operationId: addSelectedCalendars
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
async function postHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { userId: bodyUserId, ...body } = schemaSelectedCalendarBodyParams.parse(req.body);
  const args: Prisma.SelectedCalendarCreateArgs = { data: { ...body, userId } };

  if (!isAdmin && bodyUserId) throw new HttpError({ statusCode: 403, message: `ADMIN required for userId` });

  if (isAdmin && bodyUserId) {
    const where: Prisma.UserWhereInput = { id: bodyUserId };
    await prisma.user.findFirstOrThrow({ where });
    args.data.userId = bodyUserId;
  }

  const data = await prisma.selectedCalendar.create(args);

  return {
    selected_calendar: schemaSelectedCalendarPublic.parse(data),
    message: "Selected Calendar created successfully",
  };
}

export default defaultResponder(postHandler);
