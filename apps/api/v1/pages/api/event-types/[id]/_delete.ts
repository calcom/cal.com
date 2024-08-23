import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

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
 *        url: https://docs.cal.com/core-features/event-types
 *     responses:
 *       201:
 *         description: OK, eventType removed successfully
 *       403:
 *        description: Authorization information is missing or invalid.
 *       404:
 *        description: Bad request. EventType id is invalid.
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
  if (!eventType) throw new HttpError({ statusCode: 404, message: `Event type with ID ${id} not found` });

  if (eventType.teamId) {
    /** Only team owners can delete team events */
    await checkTeamEventEditPermission(req, { ...eventType, userId: eventType.userId ?? undefined });
  } else {
    /** Only parent team owners can remove user assignment */
    if (eventType.parentId) {
      const reqWithAdditionalInfo = {
        ...req,
        body: {
          ...req.body,
          parentId: eventType.parentId,
        },
        userId,
      } as NextApiRequest;
      return await checkParentEventOwnership(reqWithAdditionalInfo);
    }

    /** Only event type owners can delete it */
    if (eventType.userId !== userId) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  }
}

export default defaultResponder(deleteHandler);
