import { getUserAvailability } from "@calcom/lib/getUserAvailability";
import { responseSchemas } from "@/schema/response";
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { z } from "zod";
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { WebhookService } from '@/services/public/webhook.service';
import { AuthGuards, AuthRequest } from '@/auth/guards';
import { validateQuery, validateParams } from '@/middlewares/validation';
import { ResponseFormatter } from '@/utils/response';
import { commonSchemas, timeZone } from '@/utils/validation';
import prisma from "@calcom/prisma";
import { uploadAvatar, uploadHeader } from "@calcom/lib/server/avatar";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import { checkUsername } from "@calcom/lib/server/checkUsername";
import slugify from "@calcom/lib/slugify";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import { Prisma } from "@prisma/client";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
import { sendChangeOfEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getPremiumMonthlyPlanPriceId } from "@calcom/app-store/stripepayment/lib/utils";
import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { getDefaultScheduleId } from "@calcom/trpc/server/routers/viewer/availability/util";
import zodToJsonSchema from "zod-to-json-schema";
import { scheduleBodySchema, scheduleSchema } from "@/schema/schedule.schema";
import { webhookCreationDtoSchema, webhookUpdationDtoSchema, getWebhookRequestSchema, getWebhooksResponseSchema } from "@/schema/webhook.schema";

export const scheduleCreateSchema = 
  z.object({ name: z.string(), timeZone: timeZone.optional() })

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  const webhookService = new WebhookService(prisma);
  // Route with specific auth methods allowed
  fastify.get('/', { 
    schema: {
      description: 'Get user webhooks',
      tags: ['Webhook'],
      security: [{ bearerAuth: [] }],
      querystring: zodToJsonSchema(getWebhookRequestSchema),
      response: {
        200: zodToJsonSchema(responseSchemas.paginated(getWebhooksResponseSchema, 'User webhook retrieved')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const input = request.query as z.infer<typeof getWebhookRequestSchema>;

    const data = await webhookService.findByUserId(Number.parseInt(userId), input.limit, input.page);

    ResponseFormatter.paginated(reply, data, input.page, input.limit, data.length,  'User webhook retrieved');
  })

  // Get booking by id
  fastify.get('/:id', {
    schema: {
      description: 'Get webhook by id',
      tags: ['Webhook'],
      security: [{ bearerAuth: [] }],
      params: zodToJsonSchema(z.object({ id: z.string() })),
      // querystring: zodToJsonSchema(z.object({ expand: z.union([z.string(), z.array(z.string())]).optional() })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(getWebhooksResponseSchema, 'Webhook retrieved')), // refined below after parsing
        404: zodToJsonSchema(responseSchemas.notFound('Webhook not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {

    const userId = Number.parseInt(request.user!.id);
    const parse = z.object({ id: z.string() }).safeParse(request.params);


    if (!parse.success) {
      return ResponseFormatter.error(reply, `Validation failed: ${parse.error.errors[0].message}`, 400);
    }

    const params = parse.data;
    const id = params.id;

    const webhook = await webhookService.getById(id);

    if (!webhook || webhook.userId !== userId) {
      return ResponseFormatter.notFound(reply, 'Webhook not found');
    }

    ResponseFormatter.success(reply, webhook, 'Webhook retrieved');
  })

  fastify.patch('/:id', {
    schema: {
      description: 'Update webhook by id',
      tags: ['Webhook'],
      security: [{ bearerAuth: [] }],
      params: zodToJsonSchema(z.object({ id: z.string() })),
      body: zodToJsonSchema(webhookUpdationDtoSchema),
      // querystring: zodToJsonSchema(z.object({ expand: z.union([z.string(), z.array(z.string())]).optional() })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(getWebhooksResponseSchema, 'Webhook updated')), // refined below after parsing
        404: zodToJsonSchema(responseSchemas.notFound('Webhook not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = Number.parseInt(request.user!.id);
    const parse = z.object({ id: z.string() }).safeParse(request.params);

    if (!parse.success) {
      return ResponseFormatter.error(reply, `Validation failed: ${parse.error.errors[0].message}`, 400);
    }

    const id = parse.data.id;

    const webhookExisting = await webhookService.getById(id);

    if (!webhookExisting || webhookExisting.userId !== userId) {
      return ResponseFormatter.notFound(reply, 'Webhook not found');
    }

    const webhook = await webhookService.update(id, request.body);

    ResponseFormatter.success(reply, webhook, 'Webhook updated');
  })

  fastify.post('/', {
    schema: {
      description: 'Created webhook by id',
      tags: ['Webhook'],
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(webhookCreationDtoSchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(getWebhooksResponseSchema, 'Webhook created')), // refined below after parsing
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = Number.parseInt(request.user!.id);
    const webhook = await webhookService.create(userId, request.body);

    ResponseFormatter.success(reply, webhook, 'Webhook created');
  })

  fastify.delete('/:id', {
    schema: {
      description: 'Delete webhook by id',
      tags: ['Webhook'],
      security: [{ bearerAuth: [] }],
      params: zodToJsonSchema(z.object({ id: z.string() })),
      response: {
        200: zodToJsonSchema(responseSchemas.success(getWebhooksResponseSchema, 'Webhook updated')), // refined below after parsing
        404: zodToJsonSchema(responseSchemas.notFound('Webhook not found')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = Number.parseInt(request.user!.id);
    const parse = z.object({ id: z.string() }).safeParse(request.params);

    if (!parse.success) {
      return ResponseFormatter.error(reply, `Validation failed: ${parse.error.errors[0].message}`, 400);
    }

    const id = parse.data.id;
    const webhookExisting = await webhookService.getById(id);

    if (!webhookExisting || webhookExisting.userId !== userId) {
      return ResponseFormatter.notFound(reply, 'Webhook not found');
    }

    const webhook = await webhookService.delete(id);
    ResponseFormatter.success(reply, webhook, 'Webhook deleted');
  })
}
