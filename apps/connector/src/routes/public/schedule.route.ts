import { getUserAvailability } from "@calcom/lib/getUserAvailability";
import { responseSchemas } from "@/schema/response";
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { z } from "zod";
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { ScheduleService } from '@/services/public/schedule.service';
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

export const scheduleCreateSchema = 
  z.object({ name: z.string(), timeZone: timeZone.optional() })

export async function scheduleRoutes(fastify: FastifyInstance): Promise<void> {

  const scheduleService = new ScheduleService(prisma);
  // Route with specific auth methods allowed
  fastify.get('/', { 
    schema: {
      description: 'Get current user schedules',
      tags: ['Schedule'],
      security: [{ bearerAuth: [] }],
      response: {
        200: zodToJsonSchema(responseSchemas.success(z.array(scheduleSchema), 'Current user schedules')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const data = await scheduleService.findByUserId(Number.parseInt(userId));

    return ResponseFormatter.success(reply,  data, 'User schedules retrieved');
  }),

  fastify.post('/', { 
    schema: {
      description: 'Create a schedule',
      tags: ['Schedule'],
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(scheduleBodySchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(scheduleSchema, 'Schedule created')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const body = scheduleCreateSchema.parse(request.body);

    const id = Number.parseInt(userId);
    const data = await scheduleService.create(body, id);

    return ResponseFormatter.success(reply,  data, 'Schedule created');
  }),

  fastify.delete<{ Params: { schedule: string } }>('/:schedule', { 
      schema: {
        description: 'Create a schedule for the current user',
        tags: ['Schedule'],
        security: [{ bearerAuth: [] }],
        response: { 200: zodToJsonSchema(responseSchemas.successNoData('Schedule deleted')),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    }, async (request, reply: FastifyReply) => {
      const { schedule } = request.params;
      const userId = Number.parseInt(request.user!.id);

      const userSchedule = await prisma.schedule.findFirst({
        where: { id: Number.parseInt(schedule), userId },
      });

      if (!userSchedule) return ResponseFormatter.forbidden(reply, 'Forbidden');
  
      scheduleService.delete( Number.parseInt(schedule));

      return ResponseFormatter.success(reply, null, 'Schedule deleted');
    }
  ),


  fastify.patch<{ Params: { schedule: string } }>('/:schedule', { 
      schema: {
        description: 'Update a schedule for the current user',
        tags: ['Schedule'],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(scheduleBodySchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(scheduleSchema, 'Schedule updated')),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    }, async (request, reply: FastifyReply) => {
      const { schedule } = request.params;
      const userId = Number.parseInt(request.user!.id);

      const userSchedule = await prisma.schedule.findFirst({
        where: { id: Number.parseInt(schedule), userId },
      });

      if (!userSchedule) return ResponseFormatter.forbidden(reply, 'Forbidden');
  
      const data = await scheduleService.update( request.body as z.infer<typeof scheduleBodySchema>, userId, Number.parseInt(schedule));
      console.log("Data: ", data);

      return ResponseFormatter.success(reply, data, 'Schedule updated');
    }
  )
  
}
