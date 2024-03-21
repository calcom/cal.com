import type { NextApiRequest } from "next";

import type { UserWithCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
import { getConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { extractUserIdsFromQuery } from "~/lib/utils/extractUserIdsFromQuery";

/**
 * @swagger
 * /connected-calendars:
 *   get:
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     summary: Find all connected calendars
 *     tags:
 *      - connected-calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function getHandler(req: NextApiRequest) {
  const { userId, isAdmin } = req;

  if (!isAdmin && req.query.userId) throw new HttpError({ statusCode: 403, message: "ADMIN required" });

  const userIds = req.query.userId ? extractUserIdsFromQuery(req) : [userId];

  const usersWithCalendars = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: {
      selectedCalendars: true,
      destinationCalendar: true,
    },
  });

  const connectedCalendars = await getConnectedCalendars(usersWithCalendars);

  return { connectedCalendars: connectedCalendars };
}

async function getConnectedCalendars(users: UserWithCalendars[]) {
  const connectedDestinationCalendarsPromises = users.map((user) =>
    getConnectedDestinationCalendars(user, false, prisma)
  );
  const connectedDestinationCalendars = await Promise.all(connectedDestinationCalendarsPromises);

  return connectedDestinationCalendars.map((result) => result.connectedCalendars).flat();
}

export default defaultResponder(getHandler);
