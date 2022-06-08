import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { WebhookResponse } from "@lib/types";
import { schemaQueryIdAsString } from "@lib/validations/shared/queryIdString";
import { schemaWebhookEditBodyParams, schemaWebhookReadPublic } from "@lib/validations/webhook";

export async function WebhookById(
  { method, query, body, userId }: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  const safeQuery = schemaQueryIdAsString.safeParse(query);
  if (!safeQuery.success) {
    res.status(400).json({ message: "Your query was invalid" });
    return;
  }
  const data = await prisma.webhook.findMany({ where: { userId } });
  const userWebhooks = data.map((webhook) => webhook.id);
  if (!userWebhooks.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      /**
       * @swagger
       * /hooks/{id}:
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
      case "GET":
        await prisma.webhook
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaWebhookReadPublic.parse(data))
          .then((webhook) => res.status(200).json({ webhook }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Webhook with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /hooks/{id}:
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
       *         description: OK, webhook edited successfuly
       *       400:
       *        description: Bad request. Webhook body is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "PATCH":
        const safeBody = schemaWebhookEditBodyParams.safeParse(body);
        if (!safeBody.success) {
          {
            res.status(400).json({ message: "Invalid request body" });
            return;
          }
        }
        if (safeBody.data.eventTypeId) {
          const team = await prisma.team.findFirst({
            where: {
              eventTypes: {
                some: {
                  id: safeBody.data.eventTypeId,
                },
              },
            },
            include: {
              members: true,
            },
          });

          // Team should be available and the user should be a member of the team
          if (!team?.members.some((membership) => membership.userId === userId)) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
            });
          }
        }
        await prisma.webhook
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaWebhookReadPublic.parse(data))
          .then((webhook) => res.status(200).json({ webhook }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Webhook with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;
      /**
       * @swagger
       * /hooks/{id}:
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
       *     security:
       *       - ApiKeyAuth: []
       *     tags:
       *     - hooks
       *     externalDocs:
       *        url: https://docs.cal.com/hooks
       *     responses:
       *       201:
       *         description: OK, hook removed successfuly
       *       400:
       *        description: Bad request. hook id is invalid.
       *       401:
       *        description: Authorization information is missing or invalid.
       */
      case "DELETE":
        await prisma.webhook
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `Webhook with id: ${safeQuery.data.id} deleted`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `Webhook with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(WebhookById);
