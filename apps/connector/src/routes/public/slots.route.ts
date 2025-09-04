import { responseSchemas } from "@/schema/response";
import { slotsQuerySchema, slotsResponseSchema } from "@/schema/slots.schema";
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
            z.object({
              status: z.literal("success"),
              data: slotsResponseSchema,
            }),
            { name: "GetSlotsResponse" }
          ),
          401: {
            type: "object",
            properties: {
              status: { type: "string" },
              message: { type: "string" },
            },
          },
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
}
