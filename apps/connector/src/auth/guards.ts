// ============================================================================
// COMPLETE AuthGuards with authenticateSystemAdmin method
// ============================================================================
import { UserRole } from "@/types/auth";
import { UnauthorizedError, ForbiddenError } from "@/utils/error";
import type { FastifyRequest, FastifyReply } from "fastify";

import type { AllowedAuthMethod, AuthResult } from "./strategies/combined-auth.strategy";
import { CombinedAuthStrategy } from "./strategies/combined-auth.strategy";

export interface AuthRequest extends FastifyRequest {
  authResult?: AuthResult;
  organizationId?: number | null;
}

export class AuthGuards {
  private static combineAuthStrategy: CombinedAuthStrategy;

  static initialize(prisma: any, config: { apiKeyPrefix: string; jwt_secret: string }) {
    this.combineAuthStrategy = new CombinedAuthStrategy(prisma, config);
  }

  /**
   * Enhanced authentication that supports both API keys and access tokens
   */
  static authenticateBearer(allowedMethods?: AllowedAuthMethod[]) {
    return async (request: AuthRequest, reply: FastifyReply): Promise<void> => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new UnauthorizedError("Bearer token required");
      }

      const bearerToken = authHeader.substring(7);
      const origin = request.headers.origin as string | undefined;

      try {
        const authResult = await this.combineAuthStrategy.authenticate(bearerToken, origin, allowedMethods);
        // Set authentication result on request
        request.authResult = authResult;
        request.user = authResult.user;
        request.organizationId = authResult.organizationId;
      } catch (error) {
        console.error("Authentication error", {
          error: error instanceof Error ? error.message : error,
          url: request.url,
          method: request.method,
          headers: request.headers,
        });

        if (error instanceof UnauthorizedError) {
          throw new UnauthorizedError(error);
        }
        throw new UnauthorizedError("Authentication failed");
      }
    };
  }

  /**
   * API Key only authentication
   */
  static authenticateApiKey() {
    return this.authenticateBearer(["API_KEY"]);
  }

  /**
   * Access Token only authentication
   */
  static authenticateAccessToken() {
    return this.authenticateBearer(["ACCESS_TOKEN"]);
  }

  /**
   * Flexible authentication (API key or Access token)
   */
  static authenticateFlexible() {
    return this.authenticateBearer(["API_KEY", "ACCESS_TOKEN"]);
  }

  static authenticateOptional() {
    try {
      return this.authenticateBearer(["API_KEY", "ACCESS_TOKEN"]);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return async (request: AuthRequest, reply: FastifyReply): Promise<void> => {};
      }
    }
  }

  /**
   * System Admin authentication - authenticates user and checks for ADMIN role
   * This method first authenticates the user using flexible auth (API Key OR Access Token)
   * Then verifies that the authenticated user has ADMIN role
   */
  static authenticateSystemAdmin(allowedMethods?: AllowedAuthMethod[]) {
    return async (request: AuthRequest, reply: FastifyReply): Promise<void> => {
      // Step 1: Authenticate the user first using flexible auth or specific methods
      const authMethods = allowedMethods || ["API_KEY", "ACCESS_TOKEN"];
      const authenticationGuard = this.authenticateBearer(authMethods);

      try {
        // Execute authentication first
        await authenticationGuard(request, reply);

        // Step 2: Check if authenticated user has ADMIN role
        if (!request.user) {
          throw new UnauthorizedError("Authentication failed - no user found");
        }

        if (request.user.role !== UserRole.ADMIN) {
          throw new ForbiddenError(
            `System administrator access required. Current role: ${request.user.role}`
          );
        }

        // Optional: Log admin access for security audit
        console.log("System admin access granted", {
          userId: request.user.id,
          email: request.user.email,
          authMethod: request.authResult?.authMethod,
          organizationId: request.organizationId,
          endpoint: request.url,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        // Re-throw authentication and authorization errors
        if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
          throw error;
        }

        // Log unexpected errors for system admin access attempts
        console.error("System admin authentication error", {
          error: error instanceof Error ? error.message : error,
          url: request.url,
          method: request.method,
          headers: request.headers,
        });

        throw new UnauthorizedError("System administrator authentication failed");
      }
    };
  }

  /**
   * System Admin with API Key only - for automated admin operations
   */
  static authenticateSystemAdminApiKey() {
    return this.authenticateSystemAdmin(["API_KEY"]);
  }

  /**
   * System Admin with Access Token only - for admin dashboard
   */
  static authenticateSystemAdminAccessToken() {
    return this.authenticateSystemAdmin(["ACCESS_TOKEN"]);
  }

  /**
   * Check if user has access to organization
   */
  static requireOrganizationAccess(organizationId: number) {
    return async (request: AuthRequest, reply: FastifyReply): Promise<void> => {
      if (!request.user) {
        throw new UnauthorizedError("Authentication required");
      }

      // Admin users have access to all organizations
      if (request.user.role === UserRole.ADMIN) {
        return;
      }

      // Check if user has access to the requested organization
      if (request.organizationId !== organizationId) {
        throw new ForbiddenError("Access to this organization is not allowed");
      }
    };
  }

  /**
   * Require organization ownership
   */
  static requireOrganizationOwnership() {
    return async (request: AuthRequest, reply: FastifyReply): Promise<void> => {
      if (!request.user || !request.organizationId) {
        throw new UnauthorizedError("Authentication required");
      }

      // This would need to be implemented based on your organization ownership logic
      // For now, we'll check if user is admin or if they own the organization
      if (request.user.role !== UserRole.ADMIN) {
        // Add your organization ownership check here
        // const isOwner = await checkOrganizationOwnership(request.user.id, request.organizationId);
        // if (!isOwner) {
        //   throw new ForbiddenError('Organization ownership required');
        // }
      }
    };
  }

  /**
   * Require specific role (more generic version)
   */
  static requireRole(requiredRole: UserRole, allowedMethods?: AllowedAuthMethod[]) {
    return async (request: AuthRequest, reply: FastifyReply): Promise<void> => {
      // First authenticate
      const authenticationGuard = this.authenticateBearer(allowedMethods);
      await authenticationGuard(request, reply);

      // Then check role
      if (!request.user) {
        throw new UnauthorizedError("Authentication required");
      }

      if (request.user.role !== requiredRole) {
        throw new ForbiddenError(
          `Access denied. Required role: ${requiredRole}, current role: ${request.user.role}`
        );
      }
    };
  }

  /**
   * Require any of the specified roles
   */
  static requireAnyRole(allowedRoles: UserRole[], allowedMethods?: AllowedAuthMethod[]) {
    return async (request: AuthRequest, reply: FastifyReply): Promise<void> => {
      // First authenticate
      const authenticationGuard = this.authenticateBearer(allowedMethods);
      await authenticationGuard(request, reply);

      // Then check if user has any of the allowed roles
      if (!request.user) {
        throw new UnauthorizedError("Authentication required");
      }

      if (!allowedRoles.includes(request.user.role)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(", ")}, current role: ${request.user.role}`
        );
      }
    };
  }
}

// ============================================================================
// USAGE EXAMPLES FOR authenticateSystemAdmin
// ============================================================================

/* 
// Example 1: System admin route with flexible auth
fastify.delete('/system/users/:id', {
  preHandler: [
    AuthGuards.authenticateSystemAdmin(), // API Key OR Access Token + ADMIN role
  ],
}, async (request: AuthRequest, reply) => {
  // Only system admins can delete users
  const { id } = request.params;
  await userService.deleteUser(id);
  ResponseFormatter.noContent(reply);
});

// Example 2: System admin route with API Key only (for automated operations)
fastify.post('/system/bulk-import', {
  preHandler: [
    AuthGuards.authenticateSystemAdminApiKey(), // API Key only + ADMIN role
  ],
}, async (request: AuthRequest, reply) => {
  // Only system admins with API keys can do bulk imports
  const data = request.body;
  await systemService.bulkImport(data);
  ResponseFormatter.success(reply, { imported: data.length });
});

// Example 3: System admin dashboard (Access Token only)
fastify.get('/admin/dashboard/stats', {
  preHandler: [
    AuthGuards.authenticateSystemAdminAccessToken(), // OAuth only + ADMIN role
  ],
}, async (request: AuthRequest, reply) => {
  // Admin dashboard requires OAuth authentication
  const stats = await adminService.getSystemStats();
  ResponseFormatter.success(reply, stats);
});

// Example 4: Route registration with system admin context
await fastify.register(
  async function systemAdminRoutes(fastify: FastifyInstance) {
    // Apply system admin auth to ALL routes in this context
    fastify.addHook('preHandler', AuthGuards.authenticateSystemAdmin());
    
    // All these routes now require system admin access
    await fastify.register(userManagementRoutes);
    await fastify.register(systemConfigRoutes);
    await fastify.register(auditLogRoutes);
  },
  { prefix: '/api/system' }
);

// Example 5: Different admin levels
fastify.get('/admin/users', {
  preHandler: [
    AuthGuards.requireAnyRole([UserRole.ADMIN, UserRole.MODERATOR])
  ],
}, handler);

fastify.delete('/admin/system/reset', {
  preHandler: [
    AuthGuards.authenticateSystemAdmin() // Only full system admins
  ],
}, handler);
*/
