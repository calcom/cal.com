import type { AuthRequest } from "@/auth/guards";
import { responseSchemas } from "@/schema/response";
import {
  createUserBodySchema,
  getUsersQuerySchema,
  updateUserBodySchema,
  UserResponseSchema,
} from "@/schema/user.schema";
import { AdminUserService } from "@/services/admin/admin-user.service";
import { ConflictError } from "@/utils";
import { ResponseFormatter } from "@/utils/response";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { Prisma } from "@calcom/prisma/client";

// Parameter schemas
const getUserBySlugParamSchema = z.object({
  slug: z.string().min(2).max(100),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Response schemas for different operations
const paginatedUsersResponseSchema = responseSchemas.paginated(UserResponseSchema, "Paginated list of users");

const lockUserResponseSchema = responseSchemas.success(z.null(), "User locked successfully");

export async function apiAdminUserRoutes(fastify: FastifyInstance): Promise<void> {
  const adminUserService = new AdminUserService(fastify.prisma);

  // Route to get all users
  // Sample usage: {{baseUrl}}/admin/users?page=1&limit=20&orderBy=email&orderDir=asc&role=ADMIN
  fastify.get(
    "/users",
    {
      schema: {
        description: "Get all users (paginated)",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        querystring: zodToJsonSchema(getUsersQuerySchema),
        response: {
          200: zodToJsonSchema(paginatedUsersResponseSchema),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid query parameters")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const queryParams = getUsersQuerySchema.parse(request.query);
        const { page, limit, orderBy, orderDir, email, role, emailVerified } = queryParams;

        const filters: any = {};
        if (email) filters.email = { contains: email, mode: "insensitive" };
        if (role) filters.role = role;
        if (emailVerified !== undefined) filters.emailVerified = emailVerified ? { not: null } : null;

        const result = await adminUserService.getUsers(filters, {
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
          "User list retrieved successfully"
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid query parameters");
        }
        return ResponseFormatter.error(reply, "Failed to retrieve users", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Get Users by slug
  fastify.get(
    "/users/slug/:slug",
    {
      schema: {
        description: "Get user by slug",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(getUserBySlugParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(UserResponseSchema, "User details retrieved")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid slug parameter")),
          404: zodToJsonSchema(responseSchemas.notFound("User not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { slug } = getUserBySlugParamSchema.parse(request.params);
        console.log("slug", slug);

        const usersData = await adminUserService.getUsers({ username: slug });

        console.log("usersData", usersData);
        if (!usersData.data || usersData.data.length === 0) {
          return ResponseFormatter.notFound(reply, "User not found");
        }

        ResponseFormatter.success(reply, usersData.data[0], "User details retrieved");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid slug parameter");
        }
        return ResponseFormatter.error(reply, "Failed to retrieve user", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to create user
  fastify.post(
    "/users",
    {
      schema: {
        description: "Create a new user",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        body: zodToJsonSchema(createUserBodySchema),
        response: {
          201: zodToJsonSchema(responseSchemas.created(UserResponseSchema, "User created successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid user data")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("User already exists")),
          422: zodToJsonSchema(responseSchemas.error("Validation failed")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const userData = createUserBodySchema.parse(request.body);

        const result = await adminUserService.createUser(userData);

        ResponseFormatter.created(reply, result, "User created successfully");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid user data");
        }

        // Handling unique constraint errors
        if (error instanceof ConflictError) {
          return ResponseFormatter.conflict(reply, error.message);
        }

        return ResponseFormatter.error(reply, "Failed to create user", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to lock a user
  fastify.post(
    "/users/:id/lock",
    {
      schema: {
        description: "Lock a user account",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(idParamSchema),
        response: {
          200: zodToJsonSchema(lockUserResponseSchema),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid user ID")),
          404: zodToJsonSchema(responseSchemas.notFound("User not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params);

        // Check if user exists before locking
        const userExists = await adminUserService.userExists(id);
        if (!userExists) {
          return ResponseFormatter.notFound(reply, "User not found");
        }

        await adminUserService.lockUser(id);

        ResponseFormatter.success(reply, null, "User locked successfully");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid user ID");
        }
        return ResponseFormatter.error(reply, "Failed to lock user", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to unlock a user
  fastify.post(
    "/users/:id/unlock",
    {
      schema: {
        description: "Unlock a user account",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(idParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(z.null(), "User unlocked successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid user ID")),
          404: zodToJsonSchema(responseSchemas.notFound("User not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params);

        const userExists = await adminUserService.userExists(id);
        if (!userExists) {
          return ResponseFormatter.notFound(reply, "User not found");
        }

        await adminUserService.unLockUser(id);

        ResponseFormatter.success(reply, null, "User unlocked successfully");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid user ID");
        }
        return ResponseFormatter.error(reply, "Failed to unlock user", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to get user by ID
  fastify.get(
    "/users/:id",
    {
      schema: {
        description: "Get user by ID",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(idParamSchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(UserResponseSchema, "User details retrieved")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid user ID")),
          404: zodToJsonSchema(responseSchemas.notFound("User not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params);

        const user = await adminUserService.getUserById(id);

        ResponseFormatter.success(reply, user, "User details retrieved");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid user ID");
        }

        if (
          (typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as any).message === "string" &&
            (error as any).message.includes("not found")) ||
          ("code" in (error as object) && (error as any).code === "P2025")
        ) {
          return ResponseFormatter.notFound(reply, "User not found");
        }

        return ResponseFormatter.error(reply, "Failed to retrieve user", 500, "INTERNAL_ERROR", error);
      }
    }
  );

  // Route to update user
  fastify.put<{ Body: Prisma.UserUpdateInput }>(
    "/users/:id",
    {
      schema: {
        description: "Update user details",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        params: zodToJsonSchema(idParamSchema),
        body: zodToJsonSchema(updateUserBodySchema),
        response: {
          200: zodToJsonSchema(responseSchemas.success(UserResponseSchema, "User updated successfully")),
          400: zodToJsonSchema(responseSchemas.badRequest("Invalid user data")),
          404: zodToJsonSchema(responseSchemas.notFound("User not found")),
          401: zodToJsonSchema(responseSchemas.unauthorized()),
          409: zodToJsonSchema(responseSchemas.conflict("Email already exists")),
        },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        const updateData = updateUserBodySchema.parse(request.body);

        // Check if user exists
        const userExists = await adminUserService.userExists(id);
        if (!userExists) {
          return ResponseFormatter.notFound(reply, "User not found");
        }

        // Assuming you have an updateUser method in your service
        const updatedUser = await adminUserService.updateUser(id, updateData);

        ResponseFormatter.success(reply, updatedUser, "User updated successfully");
      } catch (error) {
        if (error instanceof z.ZodError) {
          return ResponseFormatter.zodValidationError(reply, error, "Invalid user data");
        }

        // Handling unique constraint errors
        if (error instanceof ConflictError) {
          return ResponseFormatter.conflict(reply, error.message);
        }

        return ResponseFormatter.error(reply, "Failed to update user", 500, "INTERNAL_ERROR", error);
      }
    }
  );
}
