import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

import checkParentEventOwnership from "../_utils/checkParentEventOwnership";
import checkTeamEventEditPermission from "../_utils/checkTeamEventEditPermission";

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
 *        url: https://docs.cal.com/docs/core-features/event-types
 *     responses:
 *       201:
 *         description: OK, eventType removed successfully
 *       400:
 *        description: Bad request. EventType id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await checkPermissions(req);
  await prisma.eventType.delete({ where: { id } });
  return { message: `Event Type with id: ${id} deleted successfully` };
}

async function checkPermissions(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isSystemWideAdmin) return;

  const eventType = await prisma.eventType.findFirst({ where: { id } });

  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });

  /** Only event type owners or team owners for team events can delete it */
  if (eventType.teamId) return await checkTeamEventEditPermission(req, { teamId: eventType.teamId });

  if (eventType.parentId) return await checkParentEventOwnership(req);

  if (eventType.userId && eventType.userId !== userId)
    throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default deleteHandler;
