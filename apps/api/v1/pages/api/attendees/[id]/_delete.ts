import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /attendees/{id}:
 *   delete:
 *     operationId: removeAttendeeById
 *     summary: Remove an existing attendee
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the attendee to delete
 *     tags:
 *     - attendees
 *     responses:
 *       201:
 *         description: OK, attendee removed successfully
 *       400:
 *        description: Bad request. Attendee id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await prisma.attendee.delete({ where: { id } });
  return { message: `Attendee with id: ${id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
