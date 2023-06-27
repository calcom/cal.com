import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaSelectedCalendarPublic } from "~/lib/validations/selected-calendar";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

/**
 * @swagger
 * /selected-calendars:
 *   get:
 *     operationId: listSelectedCalendars
 *     summary: Find all selected calendars
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *     tags:
 *     - selected-calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No selected calendars were found
 */
async function getHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  /* Admin gets all selected calendar by default, otherwise only the user's ones */
  const args: Prisma.SelectedCalendarFindManyArgs = isAdmin ? {} : { where: { userId } };

  /** Only admins can query other users */
  if (!isAdmin && req.query.userId) throw new HttpError({ statusCode: 403, message: "ADMIN required" });
  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    args.where = { userId: { in: userIds } };
    if (Array.isArray(query.userId)) args.orderBy = { userId: "asc" };
  }

  const data = await prisma.selectedCalendar.findMany(args);
  return { selected_calendars: data.map((v) => schemaSelectedCalendarPublic.parse(v)) };
}

export default defaultResponder(getHandler);
