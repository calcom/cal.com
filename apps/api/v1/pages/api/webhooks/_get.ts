import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";
import { schemaWebhookReadPublic } from "~/lib/validations/webhook";

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: Find all webhooks
 *     operationId: listWebhooks
 *     parameters:
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
 *         description: No webhooks were found
 */
async function getHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const args: Prisma.WebhookFindManyArgs = isAdmin
    ? {}
    : { where: { OR: [{ eventType: { userId } }, { userId }] } };

  /** Only admins can query other users */
  if (!isAdmin && req.query.userId) throw new HttpError({ statusCode: 403, message: "ADMIN required" });
  if (isAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    args.where = { OR: [{ eventType: { userId: { in: userIds } } }, { userId: { in: userIds } }] };
    if (Array.isArray(query.userId)) args.orderBy = { userId: "asc", eventType: { userId: "asc" } };
  }

  const data = await prisma.webhook.findMany(args);
  return { webhooks: data.map((v) => schemaWebhookReadPublic.parse(v)) };
}

export default defaultResponder(getHandler);
