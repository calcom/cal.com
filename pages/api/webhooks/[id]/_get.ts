import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdAsString } from "@lib/validations/shared/queryIdString";
import { schemaWebhookReadPublic } from "@lib/validations/webhook";

/**
 * @swagger
 * /webhooks/{id}:
 *   get:
 *     summary: Find a webhook
 *     operationId: getWebhookById
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the webhook to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - hooks
 *     externalDocs:
 *        url: https://docs.cal.com/hooks
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Webhook was not found
 */
export async function getHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdAsString.parse(query);
  const data = await prisma.webhook.findUniqueOrThrow({ where: { id } });
  return { webhook: schemaWebhookReadPublic.parse(data) };
}

export default defaultResponder(getHandler);
