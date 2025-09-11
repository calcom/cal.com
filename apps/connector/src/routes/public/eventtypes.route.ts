import type { AuthRequest } from "@/auth/guards";
import { responseSchemas } from "@/schema/response";
import {
  createEventTypeBodySchema,
  updateEventTypeBodySchema,
  getEventTypesQuerySchema,
  EventTypeResponseSchema,
} from "@/schema/event-type.schema";
import { EventTypeService } from "@/services/public";
import { ConflictError } from "@/utils";
import { ResponseFormatter } from "@/utils/response";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Parameter schemas
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Response schemas for different operations
const paginatedEventTypesResponseSchema = responseSchemas.paginated(
  EventTypeResponseSchema, 
  "Paginated list of event types"
);

export async function eventTypeRoutes(fastify: FastifyInstance): Promise<void> {
  const eventTypeService = new EventTypeService(fastify.prisma);

  // Route to get all event types for the authenticated user
  // Sample usage: {{baseUrl}}/event-types?page=1&limit=20&orderBy=title&orderDir=asc&hidden=false
  fastify.get(
    "/",
    {
      schema: {
        description: "Get all event types for the authenticated user (paginated)",
        tags: ["Event Types"],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(getEventTypesQuerySchema),
        response: {
          200: zodToJsonSchema(paginatedEventTypesResponseSchema),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid query parameters")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const queryParams = getEventTypesQuerySchema.parse(request.query);
        const { page, limit, orderBy, orderDir, title, slug, hidden } = queryParams;
        const userId = Number(request.user!.id);

        const filters: any = {};
        if (title) filters.title = title;
        if (slug) filters.slug = slug;
        if (hidden !== undefined) filters.hidden = hidden;

        const result = await eventTypeService.getEventTypes(userId, filters, {
          page,
          limit,
          orderBy,
          orderDir,
        });

        

        ResponseFormatter.paginated(
          reply,
          result.data,
          page,
          limit,
          result.pagination.total,
          "Event types list retrieved successfully"
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid query parameters");
        }
        return ResponseFormatter.error(reply, "Failed to retrieve event types", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to create a new event type for the authenticated user
  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new event type for the authenticated user",
        tags: ["Event Types"],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(createEventTypeBodySchema),
        response: {
          201: zodToJsonSchema(responseSchemas.created(EventTypeResponseSchema, "Event type created successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid event type data")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("Event type slug already exists")),
          422: zodToJsonSchema(responseSchemas.error("Validation failed")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const eventTypeData = createEventTypeBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        const result = await eventTypeService.createEventType(userId, eventTypeData);

        ResponseFormatter.created(reply, result, "Event type created successfully");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid event type data");
        }

        // Handling unique constraint errors
        if (error instanceof ConflictError) {
          return ResponseFormatter.conflict(reply, error.message);
        }

        return ResponseFormatter.error(reply, "Failed to create event type", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to get a specific event type by ID for the authenticated user
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get event type by ID for the authenticated user",
        tags: ["Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(idParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(EventTypeResponseSchema, "Event type details retrieved")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid event type ID")),
          404: zodToJsonSchema(responseSchemas.notFound("Event type not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        const eventType = await eventTypeService.getEventTypeById(userId, id);

        ResponseFormatter.success(reply, eventType, "Event type details retrieved");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid event type ID");
        }

        if (
          (typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as any).message === "string" &&
            (error as any).message.includes("not found")) ||
          ("code" in (error as object) && (error as any).code === "P2025")
        ) {
          return ResponseFormatter.notFound(reply, "Event type not found");
        }

        return ResponseFormatter.error(reply, "Failed to retrieve event type", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to update an event type for the authenticated user
  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Update event type details for the authenticated user",
        tags: ["Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(idParamSchema),
        body: zodToJsonSchema(updateEventTypeBodySchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(EventTypeResponseSchema, "Event type updated successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid event type data")),
          404: zodToJsonSchema(responseSchemas.notFound("Event type not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("Event type slug already exists")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        const updateData = updateEventTypeBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        // Check if event type exists and belongs to user
        const eventTypeExists = await eventTypeService.eventTypeExists(userId, id);
        if (!eventTypeExists) {
          return ResponseFormatter.notFound(reply, "Event type not found");
        }

        const updatedEventType = await eventTypeService.updateEventType(userId, id, updateData);

        ResponseFormatter.success(reply, updatedEventType, "Event type updated successfully");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid event type data");
        }

        // Handling unique constraint errors
        if (error instanceof ConflictError) {
          return ResponseFormatter.conflict(reply, error.message);
        }

        if (
          (typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as any).message === "string" &&
            (error as any).message.includes("not found")) ||
          ("code" in (error as object) && (error as any).code === "P2025")
        ) {
          return ResponseFormatter.notFound(reply, "Event type not found");
        }

        return ResponseFormatter.error(reply, "Failed to update event type", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to delete an event type for the authenticated user
  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete event type for the authenticated user",
        tags: ["Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(idParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(z.null(), "Event type deleted successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid event type ID")),
          404: zodToJsonSchema(responseSchemas.notFound("Event type not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        const eventTypeExists = await eventTypeService.eventTypeExists(userId, id);
        if (!eventTypeExists) {
          return ResponseFormatter.notFound(reply, "Event type not found");
        }

        await eventTypeService.deleteEventType(userId, id);

        ResponseFormatter.success(reply, null, "Event type deleted successfully");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid event type ID");
        }

        if (
          (typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as any).message === "string" &&
            (error as any).message.includes("not found")) ||
          ("code" in (error as object) && (error as any).code === "P2025")
        ) {
          return ResponseFormatter.notFound(reply, "Event type not found");
        }

        return ResponseFormatter.error(reply, "Failed to delete event type", 500, "INTERNAL_ERROR", error);
      }
    }
  );
}