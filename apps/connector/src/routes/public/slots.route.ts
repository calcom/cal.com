import { responseSchemas } from "@/schema/response";
import { reservationBodySchema, reservationResponseSchema, slotsQuerySchema, slotsResponseSchema } from "@/schema/slots.schema";
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { SlotsService } from "@/services/public/slots.service";

import { AuthGuards, AuthRequest } from '@/auth/guards';
import { ResponseFormatter } from '@/utils/response';
import prisma from "@calcom/prisma";
import { _SelectedSlotsModel } from "@calcom/prisma/zod";

export async function slotsRoutes(fastify: FastifyInstance) {
  const slotsService = new SlotsService(prisma);
  fastify.get(
    "/",
    {
      preHandler: AuthGuards.authenticateFlexible(),
      schema: {
        description: "Get available slots for an event type or users",
        tags: ["Slots"],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(slotsQuerySchema),
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
        reply.send({ status: "success", data: slots });

        return ResponseFormatter.success(reply, slots, 'User slots');
      },
    }
  );

  fastify.post(
    "/reserve",
    {
      preHandler: AuthGuards.authenticateOptional(),
      schema: {
        description: "Reserve a given slot",
        tags: ["Slots"],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(reservationBodySchema),
        response: {
          200: zodToJsonSchema(
            responseSchemas.success(reservationResponseSchema, "Reservation response"),
          ),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
      async handler(
        request: FastifyRequest<{ Querystring: z.infer<typeof slotsQuerySchema> }>,
        reply: FastifyReply
      ) {
        try {
          const body = request.body as z.infer<typeof reservationBodySchema>;
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

  fastify.get<{ Params: { uid: string } }>(
    "/:uid",
    {
      schema: {
        description: "Get slot by uid",
        tags: ["Slots"],
        security: [{ bearerAuth: [] }],
        response: {
          200: zodToJsonSchema(
            responseSchemas.success(_SelectedSlotsModel, "Selected slot"),
          ),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
      async handler(
        request: FastifyRequest<{ Params: { uid: string } }>,
        reply: FastifyReply
      ) {
        const { uid } = request.params;

        const userId = Number.parseInt(request.user!.id);

        // Check if event type exists and belongs to user
        const slotExists = await slotsService.slotExists(userId, uid);

        if (!slotExists) {
          return ResponseFormatter.notFound(reply, "Slot not found");
        }

        const slotResult = await slotsService.getSelectedSlotByUid(uid);

        return ResponseFormatter.success(reply, slotResult, 'Selected slot');
      },
    }
  );

  fastify.delete<{ Params: { uid: string } }>(
    "/:uid",
    {
      schema: {
        description: "Delete slot by id",
        tags: ["Slots"],
        security: [{ bearerAuth: [] }],
        response: {
          200: zodToJsonSchema(
            responseSchemas.successNoData("Deleted slot"),
          ),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
      async handler(
        request: FastifyRequest<{ Params: { uid: string } }>,
        reply: FastifyReply
      ) {
        const { uid } = request.params;

        const userId = Number.parseInt(request.user!.id);

        // Check if event type exists and belongs to user
        const slotExists = await slotsService.slotExists(userId, uid);

        if (!slotExists) {
          return ResponseFormatter.notFound(reply, "Slot not found");
        }

        const slotResult = await slotsService.deleteSelectedSlotByUid(uid);

        return ResponseFormatter.success(reply, slotResult, 'Deleted slot');
      },
    }
  );

  fastify.patch<{ Params: { uid: string } }>(
    "/:uid",
    {
      preHandler: AuthGuards.authenticateOptional(),
      schema: {
        description: "Update slot by id",
        tags: ["Slots"],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(reservationBodySchema),
        response: {
          200: zodToJsonSchema(
            responseSchemas.success(reservationResponseSchema, "Updated slot"),
          ),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
      async handler(
        request: FastifyRequest<{ Params: { uid: string } }>,
        reply: FastifyReply
      ) {
        const { uid } = request.params;

        const userId = Number.parseInt(request.user!.id);

        // Check if event type exists and belongs to user
        const slotExists = await slotsService.slotExists(userId, uid);

        if (!slotExists) {
          return ResponseFormatter.notFound(reply, "Slot not found");
        }

        try {
          const body = request.body as z.infer<typeof reservationBodySchema>;
          const authUserId =
            request.user && (request.user as any).id !== undefined
              ? Number((request.user as any).id)
              : undefined;
          const data = await slotsService.editSlot(uid, body, authUserId);
          return ResponseFormatter.success(reply, data);
        } catch (error: any) {
          const message = error?.message || "Failed to update slot";
          return ResponseFormatter.error(reply, message);
        }
      },
    }
  );

}
