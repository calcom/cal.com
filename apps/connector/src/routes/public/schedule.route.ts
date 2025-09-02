import { getUserAvailability } from "@calcom/lib/getUserAvailability";
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

export const scheduleCreateSchema = 
  z.object({ name: z.string(), timeZone: timeZone.optional() })


export async function scheduleRoutes(fastify: FastifyInstance): Promise<void> {

  const scheduleService = new ScheduleService(prisma);
  // Route with specific auth methods allowed
  fastify.get('/my-schedules', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Get current user schedules',
      tags: ['API Auth - Users'],
      security: [
        { bearerAuth: [] },
        { apiKey: [] },
      ],
      response: {
        200: {
          description: 'Current user schedules',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                schedules: {
                  type: 'object',
                  additionalProperties: true
                }
              },
            },
          },
        },
        401: {
          description: "Unauthorized",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const data = await scheduleService.findByUserId(Number.parseInt(userId));
    console.log("Data: ", data);

    return ResponseFormatter.success(reply, {schedules: data}, 'User schedules retrieved');
  }),

  fastify.post('/', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Create a schedule',
      tags: ['API Auth - Users'],
      security: [
        { bearerAuth: [] },
        { apiKey: [] },
      ],
      body: {
        type: 'object',
        properties: {
            name: {type: 'string'},
            timeZone: {type: 'string'},
            eventTypeId: {type: 'number'},
        }
      },
      response: {
        200: {
          description: 'Created schedule',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                schedules: {
                  type: 'object',
                  additionalProperties: true
                }
              },
            },
          },
        },
        401: {
          description: "Unauthorized",
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const body = scheduleCreateSchema.parse(request.body);

    const id = Number.parseInt(userId);
    const data = await scheduleService.create(body, id);
    console.log("Data: ", data);

    return ResponseFormatter.success(reply, {schedules: data}, 'User schedules retrieved');
  })}
