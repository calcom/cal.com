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
import { getWebhookRequestSchema, getWebhooksResponseSchema } from "@/schema/webhook.schema";

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


    console.log("Data is : ", data)

    const result = data.map((e) => {
      return {
        oAuthClientId: e.platformOAuthClientId?.toString() || null,
        triggers: e.eventTriggers,
        payloadTemplate: e.payloadTemplate,
        id: e.id,
        subscriberUrl: e.subscriberUrl,
        active: e.active,
        secret: e.secret,
      }
    })

    console.log("Result is: ", result)
    console.log("Schema is: ", JSON.stringify(zodToJsonSchema(responseSchemas.paginated(getWebhooksResponseSchema, 'User webhook retrieved'))))
    ResponseFormatter.paginated(reply, result, input.page, input.limit, data.length,  'User webhook retrieved');
  })
}
