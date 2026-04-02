import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";
import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     summary: Remove an existing hook
 *     operationId: removeWebhookById
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the hooks to delete
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *     tags:
 *     - webhooks
 *     externalDocs:
 *        url: https://docs.cal.com/docs/core-features/webhooks
 *     responses:
 *       201:
 *         description: OK, hook removed successfully
 *       400:
 *        description: Bad request. hook id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdAsString.parse(query);
  await prisma.webhook.delete({ where: { id } });
  return { message: `Webhook with id: ${id} deleted successfully` };
}

export default defaultResponder(deleteHandler);
