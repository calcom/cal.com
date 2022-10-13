import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import {
  schemaEventTypeCustomInputEditBodyParams,
  schemaEventTypeCustomInputPublic,
} from "@lib/validations/event-type-custom-input";
import { schemaQueryIdParseInt } from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /custom-inputs/{id}:
 *   patch:
 *     summary: Edit an existing eventTypeCustomInput
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventTypeCustomInput to edit
 *     tags:
 *     - custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput edited successfully
 *       400:
 *        description: Bad request. EventType body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = schemaEventTypeCustomInputEditBodyParams.parse(req.body);
  const result = await prisma.eventTypeCustomInput.update({ where: { id }, data });
  return { event_type_custom_input: schemaEventTypeCustomInputPublic.parse(result) };
}

export default defaultResponder(patchHandler);
