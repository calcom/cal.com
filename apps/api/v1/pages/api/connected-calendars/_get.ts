import type { UserWithCalendars } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { extractUserIdsFromQuery } from "~/lib/utils/extractUserIdsFromQuery";
import { schemaConnectedCalendarsReadPublic } from "~/lib/validations/connected-calendar";

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
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: number
 *         description: Admins can fetch connected calendars for other user e.g. &userId=1 or multiple users e.g. &userId=1&userId=2
 *     summary: Fetch connected calendars
 *     tags:
 *      - connected-calendars
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   appId:
 *                     type: string
 *                   userId:
 *                     type: number
 *                   integration:
 *                     type: string
 *                   calendars:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         externalId:
 *                           type: string
 *                         name:
 *                           type: string
 *                         primary:
 *                           type: boolean
 *                         readOnly:
 *                           type: boolean
 *             examples:
 *               connectedCalendarExample:
 *                 value: [
 *                   {
 *                     "name": "Google Calendar",
 *                     "appId": "google-calendar",
 *                     "userId": 10,
 *                     "integration": "google_calendar",
 *                     "calendars": [
 *                       {
 *                         "externalId": "alice@gmail.com",
 *                         "name": "alice@gmail.com",
 *                         "primary": true,
 *                         "readOnly": false
 *                       },
 *                       {
 *                         "externalId": "addressbook#contacts@group.v.calendar.google.com",
 *                         "name": "birthdays",
 *                         "primary": false,
 *                         "readOnly": true
 *                       },
 *                       {
 *                         "externalId": "en.latvian#holiday@group.v.calendar.google.com",
 *                         "name": "Holidays in Narnia",
 *                         "primary": false,
 *                         "readOnly": true
 *                       }
 *                     ]
 *                   }
 *                 ]
 *       401:
 *        description: Authorization information is missing or invalid.
 *       403:
 *        description: Non admin user trying to fetch other user's connected calendars.
 */

async function getHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;

  if (!isSystemWideAdmin && req.query.userId)
    throw new HttpError({ statusCode: 403, message: "ADMIN required" });

  const userIds = req.query.userId ? extractUserIdsFromQuery(req) : [userId];

  const usersWithCalendars = await new UserRepository(
    prisma
  ).findManyByIdsIncludeDestinationAndSelectedCalendars({
    ids: userIds,
  });

  return await getConnectedCalendars(usersWithCalendars);
}

async function getConnectedCalendars(users: UserWithCalendars[]) {
  const connectedDestinationCalendarsPromises = users.map((user) =>
    getConnectedDestinationCalendarsAndEnsureDefaultsInDb({ user, onboarding: false, prisma }).then(
      (connectedCalendarsResult) =>
        connectedCalendarsResult.connectedCalendars.map((calendar) => ({
          userId: user.id,
          ...calendar,
        }))
    )
  );
  const connectedDestinationCalendars = await Promise.all(connectedDestinationCalendarsPromises);

  const flattenedCalendars = connectedDestinationCalendars.flat();

  const mapped = flattenedCalendars.map((calendar) => ({
    name: calendar.integration.name,
    appId: calendar.integration.slug,
    userId: calendar.userId,
    integration: calendar.integration.type,
    calendars: (calendar.calendars ?? []).map((c) => ({
      externalId: c.externalId,
      name: c.name,
      primary: c.primary ?? false,
      readOnly: c.readOnly,
    })),
  }));

  return schemaConnectedCalendarsReadPublic.parse(mapped);
}

export default defaultResponder(getHandler);
