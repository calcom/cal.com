import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaEventTypeCustomInputPublic } from "~/lib/validations/event-type-custom-input";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /custom-inputs/{id}:
 *   get:
 *     summary: Find a eventTypeCustomInput
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         example: 101
 *         required: true
 *         description: ID of the eventTypeCustomInput to get
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         example: 1234abcd5678efgh
 *         description: Your API key
 *     tags:
 *     - custom-inputs
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: EventType was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  const data = await prisma.eventTypeCustomInput.findUniqueOrThrow({ where: { id } });
  return { event_type_custom_input: schemaEventTypeCustomInputPublic.parse(data) };
}

export default defaultResponder(getHandler);
