import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeResponse } from "@lib/types";
import {
  schemaEventTypeBodyParams,
  schemaEventTypePublic,
  withValidEventType,
} from "@lib/validations/eventType";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/eventTypes/:id/edit:
 *   patch:
 *     description: Edits an existing eventType
 *     responses:
 *       201:
 *         description: OK, eventType edited successfuly
 *         model: EventType
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editEventType(req: NextApiRequest, res: NextApiResponse<EventTypeResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaEventTypeBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const eventType = await prisma.eventType.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaEventTypePublic.parse(eventType);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidEventType(editEventType))
);
