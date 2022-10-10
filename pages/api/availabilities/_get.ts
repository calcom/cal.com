import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaAvailabilityReadBodyParams } from "@lib/validations/availability";

/**
 * @swagger
 * /availabilities:
 *   get:
 *     operationId: listAvailabilities
 *     summary: Find all availabilities
 *     tags:
 *     - availabilities
 *     externalDocs:
 *        url: https://docs.cal.com/availability
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No availabilities were found
 */
async function handler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const body = schemaAvailabilityReadBodyParams.parse(req.body || {});

  if (body.userId && !isAdmin)
    throw new HttpError({
      statusCode: 401,
      message: "Unauthorized: Only admins can request other users' availabilities",
    });

  const userIds = Array.isArray(body.userId) ? body.userId : [body.userId || userId];

  let availabilities = await prisma.availability.findMany({
    where: { Schedule: { userId: { in: userIds } } },
    include: { Schedule: { select: { userId: true } } },
    ...(Array.isArray(body.userId) && { orderBy: { userId: "asc" } }),
  });

  /**
   * IDK if this a special requirement but, since availabilities aren't directly related to a user.
   * We manually override the `userId` field so the user doesn't need to query the scheduleId just
   * to get the user that it belongs to... OR... we can just access `availability.Schedule.userId` instead
   * but at this point I'm afraid to break something so we will have both for now... ¯\_(ツ)_/¯
   */
  availabilities = availabilities.map((a) => ({ ...a, userId: a.Schedule?.userId || null }));

  if (!availabilities.length)
    throw new HttpError({ statusCode: 404, message: "No Availabilities were found" });

  return { availabilities };
}

export default defaultResponder(handler);
