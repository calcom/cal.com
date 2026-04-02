import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest } from "next";
import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";
import { schemaWebhookEditBodyParams, schemaWebhookReadPublic } from "~/lib/validations/webhook";

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
 *      - in: query
 *        name: apiKey
 *        required: true
 *        schema:
 *          type: string
 *        description: Your API key
 *     requestBody:
 *       description: Edit an existing webhook
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscriberUrl:
 *                 type: string
 *                 format: uri
 *                 description: The URL to subscribe to this webhook
 *               eventTriggers:
 *                 type: string
 *                 enum: [BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, MEETING_ENDED]
 *                 description: The events which should trigger this webhook call
 *               active:
 *                 type: boolean
 *                 description: Whether the webhook is active and should trigger on associated trigger events
 *               payloadTemplate:
 *                 type: string
 *                 description: The template of the webhook's payload
 *               eventTypeId:
 *                 type: number
 *                 description: The event type ID if this webhook should be associated with only that event type
 *               secret:
 *                 type: string
 *                 description: The secret to verify the authenticity of the received payload
 *     tags:
 *     - webhooks
 *     externalDocs:
 *        url: https://docs.cal.com/docs/core-features/webhooks
 *     responses:
 *       201:
 *         description: OK, webhook edited successfully
 *       400:
 *        description: Bad request. Webhook body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function patchHandler(req: NextApiRequest) {
  const { query, userId, isSystemWideAdmin } = req;
  const { id } = schemaQueryIdAsString.parse(query);
  const {
    eventTypeId,
    userId: bodyUserId,
    eventTriggers,
    ...data
  } = schemaWebhookEditBodyParams.parse(req.body);
  const args: Prisma.WebhookUpdateArgs = { where: { id }, data };

  if (eventTypeId) {
    const where: Prisma.EventTypeWhereInput = { id: eventTypeId };
    if (!isSystemWideAdmin) where.userId = userId;
    await prisma.eventType.findFirstOrThrow({ where });
    args.data.eventTypeId = eventTypeId;
  }

  if (!isSystemWideAdmin && bodyUserId)
    throw new HttpError({ statusCode: 403, message: `ADMIN required for userId` });

  if (isSystemWideAdmin && bodyUserId) {
    const where: Prisma.UserWhereInput = { id: bodyUserId };
    await prisma.user.findFirstOrThrow({ where });
    args.data.userId = bodyUserId;
  }

  if (eventTriggers) {
    const eventTriggersSet = new Set(eventTriggers);
    args.data.eventTriggers = Array.from(eventTriggersSet);
  }

  const result = await prisma.webhook.update(args);
  return { webhook: schemaWebhookReadPublic.parse(result) };
}

export default defaultResponder(patchHandler);
