import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { EventTypeCustomInputResponse } from "@lib/types";
import {
  schemaEventTypeCustomInputBodyParams,
  schemaEventTypeCustomInputPublic,
  withValidEventTypeCustomInput,
} from "@lib/validations/event-type-custom-input";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/event-type-custom-inputs/{id}/edit:
 *   patch:
 *     summary: Edit an existing eventTypeCustomInput
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the eventTypeCustomInput to edit
 *     tags:
 *     - eventTypeCustomInputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput edited successfuly
 *         model: EventTypeCustomInput
 *       400:
 *        description: Bad request. EventTypeCustomInput body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editEventTypeCustomInput(
  req: NextApiRequest,
  res: NextApiResponse<EventTypeCustomInputResponse>
) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaEventTypeCustomInputBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const eventTypeCustomInput = await prisma.eventTypeCustomInput.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaEventTypeCustomInputPublic.parse(eventTypeCustomInput);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidEventTypeCustomInput(editEventTypeCustomInput))
);
