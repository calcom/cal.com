import type { AuthRequest } from "@/auth/guards";
import { responseSchemas } from "@/schema/response";
import {
  createTeamBodySchema,
  updateTeamBodySchema,
  getTeamsQuerySchema,
  getTeamMembershipsQuerySchema,
  createTeamMembershipBodySchema,
  updateTeamMembershipBodySchema,
  TeamResponseSchema,
  MembershipResponseSchema,
  TeamScheduleResponseSchema,
} from "@/schema/team.schema";
import {
  createEventTypeBodySchema,
  updateEventTypeBodySchema,
  getEventTypesQuerySchema,
  EventTypeResponseSchema,
} from "@/schema/event-type.schema";
import { TeamService } from "@/services/public";
import { ConflictError, UnauthorizedError } from "@/utils";
import { ResponseFormatter } from "@/utils/response";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z, ZodError } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Parameter schemas
const teamIdParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
});

const eventTypeIdParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  eventTypeId: z.coerce.number().int().positive(),
});

const membershipIdParamSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  membershipId: z.coerce.number().int().positive(),
});

// Response schemas for different operations
const paginatedTeamsResponseSchema = responseSchemas.paginated(
  TeamResponseSchema, 
  "Paginated list of teams"
);

const paginatedEventTypesResponseSchema = responseSchemas.paginated(
  EventTypeResponseSchema, 
  "Paginated list of team event types"
);

const paginatedMembershipsResponseSchema = responseSchemas.paginated(
  MembershipResponseSchema, 
  "Paginated list of team memberships"
);

const handleError = ({
  reply,
  error,
  dbError,
  routeError
}: {
  reply: FastifyReply;
  error: unknown;
  dbError: string;
  routeError:string;
}) => {
  if (error instanceof ZodError) {
    return ResponseFormatter.zodValidationError(reply, error, "Invalid parameters");
  }

  if (error instanceof UnauthorizedError) {
    return ResponseFormatter.error(reply, error.message, 403, "FORBIDDEN");
  }

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
    return ResponseFormatter.notFound(reply, dbError);
  }

  return ResponseFormatter.error(reply, routeError, 500, "INTERNAL_ERROR", error);
}


export async function teamRoutes(fastify: FastifyInstance): Promise<void> {
  const teamService = new TeamService(fastify.prisma);

  // ====================
  // TEAM ROUTES
  // ====================

  // Get all teams for the authenticated user
  fastify.get(
    "/",
    {
      schema: {
        description: "Get all teams for the authenticated user (paginated)",
        tags: ["Teams"],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(getTeamsQuerySchema),
        response: {
          200: zodToJsonSchema(paginatedTeamsResponseSchema),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid query parameters")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const queryParams = getTeamsQuerySchema.parse(request.query);
        const { page, limit, orderBy, orderDir, name, slug, isTeamPrivate } = queryParams;
        const userId = Number(request.user!.id);

        const filters: any = {};
        if (name) filters.name = name;
        if (slug) filters.slug = slug;
        if (isTeamPrivate !== undefined) filters.isTeamPrivate = isTeamPrivate;

        const result = await teamService.getTeams(userId, filters, {
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
          "Teams list retrieved successfully"
        );
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to retrieve teams from the database",
          routeError: "Failed to retrieve teams"
        });
      }
    }
  );

  // Create a new team
  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new team for the authenticated user",
        tags: ["Teams"],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(createTeamBodySchema),
        response: {
          201: zodToJsonSchema(responseSchemas.created(TeamResponseSchema, "Team created successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid team data")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("Team slug already exists")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const teamData = createTeamBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        const result = await teamService.createTeam(userId, teamData);

        ResponseFormatter.created(reply, result, "Team created successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to create team in the database",
          routeError: "Failed to create team"
        });
      }
    }
  );

  // Get a specific team by ID
  fastify.get(
    "/:teamId",
    {
      schema: {
        description: "Get team by ID for the authenticated user",
        tags: ["Teams"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(TeamResponseSchema, "Team details retrieved")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid team ID")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        const team = await teamService.getTeamById(userId, teamId);

        ResponseFormatter.success(reply, team, "Team details retrieved");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to retrieve team from the database",
          routeError: "Failed to retrieve team"
        });
     }
    }
  );

  // Update a team
  fastify.patch(
    "/:teamId",
    {
      schema: {
        description: "Update team details for the authenticated user",
        tags: ["Teams"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        body: zodToJsonSchema(updateTeamBodySchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(TeamResponseSchema, "Team updated successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid team data")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("Team slug already exists")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const updateData = updateTeamBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        // Check if team exists and user has access
        const teamExists = await teamService.teamExists(userId, teamId);
        if (!teamExists) {
          return ResponseFormatter.notFound(reply, "Team not found");
        }

        const updatedTeam = await teamService.updateTeam(userId, teamId, updateData);

        ResponseFormatter.success(reply, updatedTeam, "Team updated successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to update team in the database",
          routeError: "Failed to update team"
        });
      }
    }
  );

  // Delete a team
  fastify.delete(
    "/:teamId",
    {
      schema: {
        description: "Delete team for the authenticated user",
        tags: ["Teams"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(z.null(), "Team deleted successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid team ID")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          403: zodToJsonSchema(responseSchemas.error("Insufficient permissions")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        const teamExists = await teamService.teamExists(userId, teamId);
        if (!teamExists) {
          return ResponseFormatter.notFound(reply, "Team not found");
        }

        await teamService.deleteTeam(userId, teamId);

        ResponseFormatter.success(reply, null, "Team deleted successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to delete team from the database",
          routeError: "Failed to delete team"
        });
      }
    }
  );

  // ====================
  // TEAM EVENT TYPE ROUTES
  // ====================

  // Get team event types
  fastify.get(
    "/:teamId/event-types",
    {
      schema: {
        description: "Get event types for a team",
        tags: ["Team Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        querystring: zodToJsonSchema(getEventTypesQuerySchema),
        response: {
          200: zodToJsonSchema(paginatedEventTypesResponseSchema),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid parameters")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const queryParams = getEventTypesQuerySchema.parse(request.query);
        const { page, limit, orderBy, orderDir, title, slug, hidden } = queryParams;
        const userId = Number(request.user!.id);

        const filters: any = {};
        if (title) filters.title = title;
        if (slug) filters.slug = slug;
        if (hidden !== undefined) filters.hidden = hidden;

        const result = await teamService.getTeamEventTypes(userId, teamId, filters, {
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
          "Team event types retrieved successfully"
        );
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to retrieve team event types from the database",
          routeError: "Failed to retrieve team event types"
        });
      }
    }
  );

  // Create team event type
  fastify.post(
    "/:teamId/event-types",
    {
      schema: {
        description: "Create an event type for a team",
        tags: ["Team Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        body: zodToJsonSchema(createEventTypeBodySchema),
        response: {
          201: zodToJsonSchema(responseSchemas.created(EventTypeResponseSchema, "Team event type created successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid event type data")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("Event type slug already exists")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const eventTypeData = createEventTypeBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        const result = await teamService.createTeamEventType(userId, teamId, eventTypeData);

        ResponseFormatter.created(reply, result, "Team event type created successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to create team event type in the database",
          routeError: "Failed to create team event type"
        });
      }
    }
  );

  // Get specific team event type
  fastify.get(
    "/:teamId/event-types/:eventTypeId",
    {
      schema: {
        description: "Get a team event type by ID",
        tags: ["Team Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(eventTypeIdParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(EventTypeResponseSchema, "Team event type retrieved")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid parameters")),
          404: zodToJsonSchema(responseSchemas.notFound("Team event type not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId, eventTypeId } = eventTypeIdParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        const eventType = await teamService.getTeamEventTypeById(userId, teamId, eventTypeId);

        ResponseFormatter.success(reply, eventType, "Team event type retrieved");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to retrieve team event type from the database",
          routeError: "Failed to retrieve team event type"
        });
      }
    }
  );

  // Update team event type
  fastify.patch(
    "/:teamId/event-types/:eventTypeId",
    {
      schema: {
        description: "Update a team event type",
        tags: ["Team Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(eventTypeIdParamSchema),
        body: zodToJsonSchema(updateEventTypeBodySchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(EventTypeResponseSchema, "Team event type updated successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid event type data")),
          404: zodToJsonSchema(responseSchemas.notFound("Team event type not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("Event type slug already exists")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId, eventTypeId } = eventTypeIdParamSchema.parse(request.params);
        const updateData = updateEventTypeBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        const updatedEventType = await teamService.updateTeamEventType(userId, teamId, eventTypeId, updateData);

        ResponseFormatter.success(reply, updatedEventType, "Team event type updated successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to update team event type in the database",
          routeError: "Failed to update team event type"
        });
      }
    }
  );

  // Delete team event type
  fastify.delete(
    "/:teamId/event-types/:eventTypeId",
    {
      schema: {
        description: "Delete a team event type",
        tags: ["Team Event Types"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(eventTypeIdParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(z.null(), "Team event type deleted successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid parameters")),
          404: zodToJsonSchema(responseSchemas.notFound("Team event type not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId, eventTypeId } = eventTypeIdParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        await teamService.deleteTeamEventType(userId, teamId, eventTypeId);

        ResponseFormatter.success(reply, null, "Team event type deleted successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to delete team event type from the database",
          routeError: "Failed to delete team event type"
        });
      }
    }
  );

  // ====================
  // TEAM MEMBERSHIP ROUTES
  // ====================

  // Get team memberships
  fastify.get(
    "/:teamId/memberships",
    {
      schema: {
        description: "Get memberships of a team",
        tags: ["Team Memberships"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        querystring: zodToJsonSchema(getTeamMembershipsQuerySchema),
        response: {
          200: zodToJsonSchema(paginatedMembershipsResponseSchema),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid parameters")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const queryParams = getTeamMembershipsQuerySchema.parse(request.query);
        const { page, limit, orderBy, orderDir, role, acceptedInvitation } = queryParams;
        const userId = Number(request.user!.id);

        const filters: any = {};
        if (role) filters.role = role;
        if (acceptedInvitation !== undefined) filters.acceptedInvitation = acceptedInvitation;

        const result = await teamService.getTeamMemberships(userId, teamId, filters, {
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
          "Team memberships retrieved successfully"
        );
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to retrieve team memberships from the database",
          routeError: "Failed to retrieve team memberships"
        });
      }
    }
  );

  // Create team membership
  fastify.post(
    "/:teamId/memberships",
    {
      schema: {
        description: "Create a team membership",
        tags: ["Team Memberships"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        body: zodToJsonSchema(createTeamMembershipBodySchema),
        response: {
          201: zodToJsonSchema(responseSchemas.created(MembershipResponseSchema, "Team membership created successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid membership data")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          403: zodToJsonSchema(responseSchemas.error("Insufficient permissions")),
          409: zodToJsonSchema(responseSchemas.conflict("User is already a member of this team")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const membershipData = createTeamMembershipBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        const result = await teamService.createTeamMembership(userId, teamId, membershipData);

        ResponseFormatter.created(reply, result, "Team membership created successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to create team membership in the database",
          routeError: "Failed to create team membership"
        });
      }
    }
  );

  // Get specific team membership
  fastify.get(
    "/:teamId/memberships/:membershipId",
    {
      schema: {
        description: "Get a specific membership of a team",
        tags: ["Team Memberships"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(membershipIdParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(MembershipResponseSchema, "Team membership retrieved")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid parameters")),
          404: zodToJsonSchema(responseSchemas.notFound("Team membership not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId, membershipId } = membershipIdParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        const membership = await teamService.getTeamMembershipById(userId, teamId, membershipId);

        ResponseFormatter.success(reply, membership, "Team membership retrieved");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to retrieve team membership from the database",
          routeError: "Failed to retrieve team membership"
        });
      }
    }
  );

  // Update team membership
  fastify.patch(
    "/:teamId/memberships/:membershipId",
    {
      schema: {
        description: "Update a membership of a team",
        tags: ["Team Memberships"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(membershipIdParamSchema),
        body: zodToJsonSchema(updateTeamMembershipBodySchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(MembershipResponseSchema, "Team membership updated successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid membership data")),
          404: zodToJsonSchema(responseSchemas.notFound("Team membership not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          403: zodToJsonSchema(responseSchemas.error("Insufficient permissions")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId, membershipId } = membershipIdParamSchema.parse(request.params);
        const updateData = updateTeamMembershipBodySchema.parse(request.body);
        const userId = Number(request.user!.id);

        const updatedMembership = await teamService.updateTeamMembership(userId, teamId, membershipId, updateData);

        ResponseFormatter.success(reply, updatedMembership, "Team membership updated successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to update team membership in the database",
          routeError: "Failed to update team membership"
        });
      }
    }
  );

  // Delete team membership
  fastify.delete(
    "/:teamId/memberships/:membershipId",
    {
      schema: {
        description: "Delete a membership of a team",
        tags: ["Team Memberships"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(membershipIdParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(z.null(), "Team membership deleted successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid parameters")),
          404: zodToJsonSchema(responseSchemas.notFound("Team membership not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          403: zodToJsonSchema(responseSchemas.error("Insufficient permissions")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId, membershipId } = membershipIdParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        await teamService.deleteTeamMembership(userId, teamId, membershipId);

        ResponseFormatter.success(reply, null, "Team membership deleted successfully");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to delete team membership from the database",
          routeError: "Failed to delete team membership"
        });
      }
    }
  );

  // ====================
  // TEAM SCHEDULES ROUTES
  // ====================

  // Get team schedules
  fastify.get(
    "/:teamId/schedules",
    {
      schema: {
        description: "Get all team members' schedules",
        tags: ["Team Schedules"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(teamIdParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(z.array(TeamScheduleResponseSchema), "Team schedules retrieved")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid team ID")),
          404: zodToJsonSchema(responseSchemas.notFound("Team not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          403: zodToJsonSchema(responseSchemas.error("Insufficient permissions")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { teamId } = teamIdParamSchema.parse(request.params);
        const userId = Number(request.user!.id);

        const schedules = await teamService.getTeamSchedules(userId, teamId);

        ResponseFormatter.success(reply, schedules, "Team schedules retrieved");
      } catch (error) {
        handleError({
          reply,
          error,
          dbError: "Failed to retrieve team schedules from the database",
          routeError: "Failed to retrieve team schedules"
        });
      }
    }
  );
}