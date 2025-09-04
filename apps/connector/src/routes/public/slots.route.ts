import { responseSchemas } from "@/schema/response";
import { reservationBodySchema, reservationResponseSchema, slotsQuerySchema, slotsResponseSchema } from "@/schema/slots.schema";
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SlotsService } from "@/services/public/slots.service";

import { AuthGuards, AuthRequest } from '@/auth/guards';
import { ResponseFormatter } from '@/utils/response';
import prisma from "@calcom/prisma";

export async function slotsRoutes(fastify: FastifyInstance) {
  const slotsService = new SlotsService(prisma);
  fastify.get(
    "/get",
    {
      schema: {
        description: "Get available slots for an event type or users",
        tags: ["Slots"],
        querystring: zodToJsonSchema(slotsQuerySchema, { name: "SlotsQuery" }),
        response: {
          200: zodToJsonSchema(
            responseSchemas.success(slotsResponseSchema, "GetSlotsResponse"),
          ),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
      async handler(
        request: FastifyRequest<{ Querystring: z.infer<typeof slotsQuerySchema> }>,
        reply: FastifyReply
      ) {
        const query = request.query;
        const slots = await slotsService.getAvailableSlots(query);
        console.log("Got data: ", JSON.stringify(slots))
        reply.send({ status: "success", data: slots });
      },
    }
  );

  fastify.post(
    "/reserve",
    {
      preHandler: AuthGuards.authenticateOptional(),
      schema: {
        description: "Get available slots for an event type or users",
        tags: ["Slots"],
        body: zodToJsonSchema(reservationBodySchema, { name: "SlotsQuery" }),
        response: {
          200: zodToJsonSchema(
            responseSchemas.success(reservationResponseSchema, "GetSlotsResponse"),
          ),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
      async handler(
        request: FastifyRequest,
        reply: FastifyReply
      ) {
        try {
          const body = request.body as z.infer<typeof reservationBodySchema>;
          const slotsService = new SlotsService(prisma);
          const authUserId =
            request.user && (request.user as any).id !== undefined
              ? Number((request.user as any).id)
              : undefined;
          const data = await slotsService.reserveSlot(body, authUserId);
          return ResponseFormatter.success(reply, data);
        } catch (error: any) {
          const message = error?.message || "Failed to reserve slot";
          return ResponseFormatter.error(reply, message);
        }
      },
    }
  );
}
