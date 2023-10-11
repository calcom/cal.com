import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /destination-calendars/{id}:
 *   delete:
 *     summary: Remove an existing destination calendar
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the destination calendar to delete
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *     tags:
 *      - destination-calendars
 *     responses:
 *       201:
 *         description: OK, destinationCalendar removed successfully
 *       400:
 *        description: Bad request. DestinationCalendar id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await checkPermissions(req);
  await prisma.destinationCalendar.delete({ where: { id } });
  return { message: `Destination Calendar with id: ${id} deleted successfully` };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, prisma, isAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isAdmin) return;
  const destinationCalendar = await prisma.destinationCalendar.findFirst({ where: { id, userId } });
  if (!destinationCalendar) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default defaultResponder(deleteHandler);
