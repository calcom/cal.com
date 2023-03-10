import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";
import { schemaWebhookReadPublic } from "~/lib/validations/webhook";

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
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     tags:
 *     - webhooks
 *     externalDocs:
 *        url: https://docs.cal.com/core-features/webhooks
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
