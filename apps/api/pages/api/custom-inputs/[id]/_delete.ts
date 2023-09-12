import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /custom-inputs/{id}:
 *   delete:
 *     summary: Remove an existing eventTypeCustomInput
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the eventTypeCustomInput to delete
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *     tags:
 *     - custom-inputs
 *     responses:
 *       201:
 *         description: OK, eventTypeCustomInput removed successfully
 *       400:
 *        description: Bad request. EventType id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  await prisma.eventTypeCustomInput.delete({ where: { id } });
  return { message: `CustomInputEventType with id: ${id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
