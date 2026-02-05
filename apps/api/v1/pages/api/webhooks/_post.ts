import type { NextApiRequest } from "next";
import { v4 as uuidv4 } from "uuid";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { schemaWebhookCreateBodyParams, schemaWebhookReadPublic } from "~/lib/validations/webhook";

/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Creates a new webhook
 *     operationId: addWebhook
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     requestBody:
 *       description: Create a new webhook
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriberUrl
 *               - eventTriggers
 *               - active
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
 *         description: OK, webhook created
 *       400:
 *        description: Bad request. webhook body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const {
    eventTypeId,
    userId: bodyUserId,
    eventTriggers,
    ...body
  } = schemaWebhookCreateBodyParams.parse(req.body);
  const args: Prisma.WebhookCreateArgs = { data: { id: uuidv4(), ...body } };

  // If no event type, we assume is for the current user. If admin we run more checks below...
  if (!eventTypeId) args.data.userId = userId;

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

  const data = await prisma.webhook.create(args);

  return {
    webhook: schemaWebhookReadPublic.parse(data),
    message: "Webhook created successfully",
  };
}

export default defaultResponder(postHandler);
