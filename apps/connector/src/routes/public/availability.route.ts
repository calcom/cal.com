
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
  fastify.get('/', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Get current user availability',
      tags: ['Availability'],
      security: [{ bearerAuth: [] }],
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
      description: 'Create availability for the current user and given schedule',
      tags: ['Availability'],
      security: [{ bearerAuth: [] }],
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
  }),

  fastify.delete<{ Params: { availability: string } }>('/:availability', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Delete an availability',
      tags: ['Availability'],
      security: [{ bearerAuth: [] }],
      response: {
        200: zodToJsonSchema(responseSchemas.successNoData('Availability deleted')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const { availability } = request.params;
    const userId = Number.parseInt(request.user!.id);

    const userAvailability = await prisma.availability.findFirst({
      where: { id: Number.parseInt(availability), Schedule: { userId } },
    });

    if (!userAvailability) return ResponseFormatter.forbidden(reply, 'Forbidden');

    availabilityService.delete( Number.parseInt(availability));

    return ResponseFormatter.success(reply, null, 'Availability deleted');
  })

  fastify.patch<{ Params: { availability: string } }>('/:availability', { 
    preHandler: AuthGuards.authenticateFlexible(),
    schema: {
      description: 'Update an availability',
      tags: ['Availability'],
      security: [{ bearerAuth: [] }],
      body: zodToJsonSchema(availabilityCreationBodySchema),
      response: {
        200: zodToJsonSchema(responseSchemas.success(availabilityWithScheduleSchema, 'Created availability')),
        401: zodToJsonSchema(responseSchemas.unauthorized()),
      },
    },
  }, async (request: AuthRequest, reply: FastifyReply) => {
    const { availability } = request.params;
    const userId = Number.parseInt(request.user!.id);

    const userAvailability = await prisma.availability.findFirst({
      where: { id: Number.parseInt(availability), Schedule: { userId } },
    });

    if (!userAvailability) return ResponseFormatter.forbidden(reply, 'Forbidden');

    const data = await availabilityService.update( request.body as z.infer<typeof availabilityCreationBodySchema>, userId, Number.parseInt(availability));

    console.log("Data: ", data);

    return ResponseFormatter.success(reply, data, 'Availability updated');
  })
}
