import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaDestinationCalendarReadPublic } from "~/lib/validations/destination-calendar";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /destination-calendars/{id}:
 *   get:
 *     summary: Find a destination calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the destination calendar to get
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     tags:
 *      - destination-calendars
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: DestinationCalendar was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);

  const destinationCalendar = await prisma.destinationCalendar.findUnique({
    where: { id },
  });
  await checkPermissions(req);

  return { destinationCalendar: schemaDestinationCalendarReadPublic.parse({ ...destinationCalendar }) };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, prisma, isAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isAdmin) return;
  const destinationCalendar = await prisma.destinationCalendar.findFirst({ where: { id, userId } });
  if (!destinationCalendar) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default defaultResponder(getHandler);
