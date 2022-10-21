import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdAsString } from "@lib/validations/shared/queryIdString";
import { schemaWebhookEditBodyParams, schemaWebhookReadPublic } from "@lib/validations/webhook";

/**
 * @swagger
 * /webhooks/{id}:
 *   patch:
 *     summary: Edit an existing webhook
 *     operationId: editWebhookById
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the webhook to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - hooks
 *     externalDocs:
 *        url: https://docs.cal.com/hooks
 *     responses:
 *       201:
 *         description: OK, webhook edited successfully
 *       400:
 *        description: Bad request. Webhook body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { prisma, query, userId, isAdmin } = req;
  const { id } = schemaQueryIdAsString.parse(query);
  const { eventTypeId, userId: bodyUserId, ...data } = schemaWebhookEditBodyParams.parse(req.body);
  const args: Prisma.WebhookUpdateArgs = { where: { id }, data };

  if (eventTypeId) {
    const where: Prisma.EventTypeWhereInput = { id: eventTypeId };
    if (!isAdmin) where.userId = userId;
    await prisma.eventType.findFirstOrThrow({ where });
    args.data.eventTypeId = eventTypeId;
  }

  if (!isAdmin && bodyUserId) throw new HttpError({ statusCode: 403, message: `ADMIN required for userId` });

  if (isAdmin && bodyUserId) {
    const where: Prisma.UserWhereInput = { id: bodyUserId };
    await prisma.user.findFirstOrThrow({ where });
    args.data.userId = bodyUserId;
  }

  const result = await prisma.webhook.update(args);
  return { webhook: schemaWebhookReadPublic.parse(result) };
}

export default defaultResponder(patchHandler);
