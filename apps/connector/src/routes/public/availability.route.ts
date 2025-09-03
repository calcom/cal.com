
import { AvailabilityService } from '@/services/public/availability.service';
import { getUserAvailability } from "@calcom/lib/getUserAvailability";
import { responseSchemas } from "@/schema/response";
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from "zod";
import { availabilityCreationSchema,availabilityQueryStringSchema, availabilitySchema, availabilityQueryResponseSchema, availabilityWithScheduleSchema, availabilityCreationBodySchema } from '@/schema/availability.schema';
import { zodToJsonSchema } from "zod-to-json-schema";

import { AuthGuards, AuthRequest } from '@/auth/guards';
import { ResponseFormatter } from '@/utils/response';
import prisma from "@calcom/prisma";

export async function availabilityRoutes(fastify: FastifyInstance): Promise<void> {
  const availabilityService = new AvailabilityService(prisma);
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
      querystring: zodToJsonSchema(availabilityQueryStringSchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(availabilityQueryResponseSchema, 'Current user availability')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
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

      ResponseFormatter.success(reply, data, 'User availability retrieved');
      // return {availability: data}
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
      body: zodToJsonSchema(availabilityCreationBodySchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(availabilityWithScheduleSchema, 'Created availability')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const body = availabilityCreationSchema.parse(request.body);

    const data = await availabilityService.create(body);

    return ResponseFormatter.success(reply, data, 'Availability created');
  })}
