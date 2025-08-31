import type { AuthRequest } from "@/auth/guards";
import { AdminUserService } from "@/services/admin/admin-user.service";
import { ResponseFormatter } from "@/utils/response";
import { commonSchemas } from "@/utils/validation";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

const getUserParamsSchema = z.object({
  id: commonSchemas.id,
});

export async function apiAdminUserRoutes(fastify: FastifyInstance): Promise<void> {
  const adminUserService = new AdminUserService(fastify.prisma);

  //route to get all users
  //Sample usage : {{baseUrl}}/admin/users?page=1&limit=20&orderBy=email&orderDir=asc&role=ADMIN
  fastify.get(
    "/users",
    {
      schema: {
        description: "Get all users (paginated)",
        tags: ["API Auth - Users"],
        security: [{ bearerAuth: [] }, { apiKey: [] }],
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
            orderBy: { type: "string", enum: ["id", "email", "name", "role", "createdDate"] },
            orderDir: { type: "string", enum: ["asc", "desc"], default: "desc" },
            email: { type: "string" },
            role: { type: "string" },
            emailVerified: { type: "boolean" },
          },
        },
        // response: {
        //   200: {
        //     description: "List of users with pagination",
        //     type: "object",
        //     properties: {
        //       success: { type: "boolean" },
        //       message: { type: "string" },
        //       data: {
        //         type: "array",
        //         items: {
        //           type: "object",
        //           properties: {
        //             id: { type: "number" },
        //             email: { type: "string" },
        //             name: { type: "string" },
        //             role: { type: "string" },
        //             emailVerified: { type: ["boolean", "null"] },
        //             createdDate: { type: "string" },
        //           },
        //         },
        //       },
        //       pagination: {
        //         type: "object",
        //         properties: {
        //           page: { type: "integer" },
        //           limit: { type: "integer" },
        //           total: { type: "integer" },
        //           totalPages: { type: "integer" },
        //         },
        //       },
        //     },
        //   },
        // },
      },
    },
    async (request: AuthRequest, reply: FastifyReply) => {
      const { page, limit, orderBy, orderDir, email, role, emailVerified } = request.query as any;

      const result = await adminUserService.getUsers(
        { email, role, emailVerified },
        { page, limit, orderBy, orderDir }
      );

      ResponseFormatter.success(reply, result.data, "User list retrieved", 200, result.pagination);
    }
  );

  //   //get user by ID
  //   fastify.get(
  //     "/users/:id",
  //     {
  //       schema: {
  //         description: "Get user by ID",
  //         tags: ["API Auth - Users"],
  //         security: [{ bearerAuth: [] }, { apiKey: [] }],
  //         params: getUserParamsSchema,
  //         response: {
  //           200: {
  //             description: "User details",
  //             type: "object",
  //             properties: {
  //               success: { type: "boolean" },
  //               message: { type: "string" },
  //               data: {
  //                 type: "object",
  //                 properties: {
  //                   id: { type: "number" },
  //                   email: { type: "string" },
  //                   name: { type: "string" },
  //                   role: { type: "string" },
  //                   organizationId: { type: "number", nullable: true },
  //                 },
  //               },
  //             },
  //           },
  //           401: {
  //             description: "Unauthorized",
  //             type: "object",
  //             properties: {
  //               success: { type: "boolean" },
  //               message: { type: "string" },
  //             },
  //           },
  //           404: {
  //             description: "User not found",
  //             type: "object",
  //             properties: {
  //               success: { type: "boolean" },
  //               message: { type: "string" },
  //             },
  //           },
  //         },
  //       },
  //     },
  //     async (request: AuthRequest, reply: FastifyReply) => {
  //       const user = await adminUserService.getUserById(Number(request.user?.id));

  //       if (!user) {
  //         return ResponseFormatter.error(reply, "User not found");
  //       }

  //       ResponseFormatter.success(reply, user, "User details retrieved");
  //     }
  //   );
}
