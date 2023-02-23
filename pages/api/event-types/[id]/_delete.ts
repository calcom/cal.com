import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /event-types/{id}:
 *   delete:
 *     operationId: removeEventTypeById
 *     summary: Remove an existing eventType
 *     parameters:
 *      - in: query
 *        name: apiKey
 *        schema:
 *          type: string
 *        required: true
 *        description: Your API Key
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventType to delete
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/core-features/event-types
 *     responses:
 *       201:
 *         description: OK, eventType removed successfully
 *       400:
 *        description: Bad request. EventType id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await checkPermissions(req);
  await prisma.eventType.delete({ where: { id } });
  return { message: `Event Type with id: ${id} deleted successfully` };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, prisma, isAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isAdmin) return;
  /** Only event type owners can delete it */
  const eventType = await prisma.eventType.findFirst({ where: { id, userId } });
  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default defaultResponder(deleteHandler);
