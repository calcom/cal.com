import type { NextApiRequest } from "next";
import { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import {
  schemaEventTypeEditBodyParams,
  schemaEventTypeBaseBodyParams,
  schemaEventTypeReadPublic,
} from "~/lib/validations/event-type";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

import checkTeamEventEditPermission from "../_utils/checkTeamEventEditPermission";

/**
 * @swagger
 * /event-types/{id}:
 *   patch:
 *     operationId: editEventTypeById
 *     summary: Edit an existing eventType
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventType to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - event-types
 *     externalDocs:
 *        url: https://docs.cal.com/event-types
 *     responses:
 *       201:
 *         description: OK, eventType edited successfully
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query, body } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaEventTypeEditBodyParams.parse(body);
  await checkPermissions(req, body);
  const event_type = await prisma.eventType.update({ where: { id }, data });
  return { event_type: schemaEventTypeReadPublic.parse(event_type) };
}

async function checkPermissions(req: NextApiRequest, body: z.infer<typeof schemaEventTypeBaseBodyParams>) {
  const { userId, prisma, isAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isAdmin) return;
  /** Only event type owners can modify it */
  const eventType = await prisma.eventType.findFirst({ where: { id, userId } });
  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  await checkTeamEventEditPermission(req, body);
}

export default defaultResponder(patchHandler);
