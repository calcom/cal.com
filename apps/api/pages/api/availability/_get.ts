import type { NextApiRequest } from "next";
import { z } from "zod";

import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { availabilityUserSelect } from "@calcom/prisma";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

/**
 * @swagger
 * /availability:
 *   get:
 *     summary: Find user or team availability
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         example: "1234abcd5678efgh"
 *         description: Your API key
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         example: 101
 *         description: ID of the user to fetch the availability for
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: integer
 *         example: 123
 *         description: ID of the team to fetch the availability for
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         example: "alice"
 *         description: username of the user to fetch the availability for
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         example: "2023-05-14 00:00:00"
 *         description: Start Date of the availability query
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         example: "2023-05-20 00:00:00"
 *         description: End Date of the availability query
 *       - in: query
 *         name: eventTypeId
 *         schema:
 *           type: integer
 *         example: 123
 *         description: Event Type ID of the event type to fetch the availability for
 *     operationId: availability
 *     tags:
 *     - availability
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 busy:
 *                   - start: "2023-05-14T10:00:00.000Z"
 *                     end: "2023-05-14T11:00:00.000Z"
 *                     title: "Team meeting between Alice and Bob"
 *                   - start: "2023-05-15T14:00:00.000Z"
 *                     end: "2023-05-15T15:00:00.000Z"
 *                     title: "Project review between Carol and Dave"
 *                   - start: "2023-05-16T09:00:00.000Z"
 *                     end: "2023-05-16T10:00:00.000Z"
 *                   - start: "2023-05-17T13:00:00.000Z"
 *                     end: "2023-05-17T14:00:00.000Z"
 *                 timeZone: "America/New_York"
 *                 workingHours:
 *                   - days: [1, 2, 3, 4, 5]
 *                     startTime: 540
 *                     endTime: 1020
 *                     userId: 101
 *                 dateOverrides:
 *                   - date: "2023-05-15"
 *                     startTime: 600
 *                     endTime: 960
 *                     userId: 101
 *                 currentSeats: 4
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: User not found | Team not found | Team has no members
 */

const availabilitySchema = z
  .object({
    userId: stringOrNumber.optional(),
    teamId: stringOrNumber.optional(),
    username: z.string().optional(),
    dateFrom: z.string(),
    dateTo: z.string(),
    eventTypeId: stringOrNumber.optional(),
  })
  .refine(
    (data) => !!data.username || !!data.userId || !!data.teamId,
    "Either username or userId or teamId should be filled in."
  );

async function handler(req: NextApiRequest) {
  const { prisma, isAdmin } = req;
  const { username, userId, eventTypeId, dateTo, dateFrom, teamId } = availabilitySchema.parse(req.query);
  if (!teamId)
    return getUserAvailability({
      username,
      dateFrom,
      dateTo,
      eventTypeId,
      userId,
    });
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { members: true },
  });
  if (!team) throw new HttpError({ statusCode: 404, message: "teamId not found" });
  if (!team.members) throw new HttpError({ statusCode: 404, message: "team has no members" });
  const allMemberIds = team.members.map((membership) => membership.userId);
  const members = await prisma.user.findMany({
    where: { id: { in: allMemberIds } },
    select: availabilityUserSelect,
  });
  if (!isAdmin) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  const availabilities = members.map(async (user) => {
    return {
      userId: user.id,
      availability: await getUserAvailability({
        userId: user.id,
        dateFrom,
        dateTo,
        eventTypeId,
      }),
    };
  });
  const settled = await Promise.all(availabilities);
  if (!settled)
    throw new HttpError({
      statusCode: 401,
      message: "We had an issue retrieving all your members availabilities",
    });
  return settled;
}

export default defaultResponder(handler);
