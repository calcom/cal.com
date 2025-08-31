import type { AuthUser, JwtPayload } from "@/types/auth";
import type { FastifyInstance } from "fastify";

export async function authDecorators(fastify: FastifyInstance): Promise<void> {
  // Decorator to extract user from JWT payload
  fastify.decorateRequest("user", null);

  // Add hook to set user after JWT verification
  fastify.addHook("preHandler", async (request, reply) => {
    // Only set user if JWT verification was successful and payload exists
    if (request.user && typeof request.user === "object" && "userId" in request.user) {
      const payload = request.user as JwtPayload;

      const authUser: AuthUser = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };

      request.user = authUser;
    }
  });

  // Decorator to check if current user is authenticated
  fastify.decorate("isAuthenticated", function (this: FastifyInstance, request: any) {
    return !!request.user;
  });

  // Decorator to check if current user has specific role
  fastify.decorate("hasRole", function (this: FastifyInstance, request: any, role: string) {
    return request.user?.role === role;
  });

  // Decorator to check if current user is admin
  fastify.decorate("isAdmin", function (this: FastifyInstance, request: any) {
    return request.user?.role === "ADMIN";
  });
}

// Extend Fastify types for decorators
declare module "fastify" {
  interface FastifyInstance {
    isAuthenticated(request: FastifyRequest): boolean;
    hasRole(request: FastifyRequest, role: string): boolean;
    isAdmin(request: FastifyRequest): boolean;
  }
}
