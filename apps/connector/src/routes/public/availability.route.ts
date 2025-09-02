
import { getUserAvailability } from "@calcom/lib/getUserAvailability";
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { z } from "zod";
import { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR, FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { UserService } from '@/services/public/user.service';
import { AuthGuards, AuthRequest } from '@/auth/guards';
import { validateQuery, validateParams } from '@/middlewares/validation';
import { ResponseFormatter } from '@/utils/response';
import { commonSchemas } from '@/utils/validation';
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

const availabilitySchema = z
  .object({
    dateFrom: z.string(),
    dateTo: z.string(),
    eventTypeId: stringOrNumber.optional(),
  })

export async function availabilityRoutes(fastify: FastifyInstance): Promise<void> {
  // Route with specific auth methods allowed
  fastify.get('/my-availability', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Get current user availability',
      tags: ['API Auth - Users'],
      security: [
        { bearerAuth: [] },
        { apiKey: [] },
      ],
      querystring: {
        type: 'object',
        properties: {
            dateFrom: {type: 'string'},
            dateTo: {type: 'string'},
            eventTypeId: {type: 'number'},
        }
      },
      response: {
        200: {
          description: 'Current user availability',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                availability: {
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
      const input = request.query as z.infer<typeof availabilitySchema>;

      const { eventTypeId, dateTo, dateFrom } = input;

      const data = await getUserAvailability({
        dateFrom,
        dateTo,
        eventTypeId,
        userId: Number.parseInt(request.user!.id),
        returnDateOverrides: true,
        bypassBusyCalendarTimes: false,
      })

      console.log("Got data: ", data);
      ResponseFormatter.success(reply, {availability: data}, 'User availability retrieved');
      // return {availability: data}
  });}