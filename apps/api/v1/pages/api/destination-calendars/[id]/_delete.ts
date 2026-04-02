import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
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
 *       200:
 *         description: OK, destinationCalendar removed successfully
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *        description: Destination calendar not found
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await prisma.destinationCalendar.delete({ where: { id } });
  return { message: `OK, Destination Calendar removed successfully` };
}

export default defaultResponder(deleteHandler);
