import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { Request } from "express";
import jwt from "jsonwebtoken";

import type { OAuthTokenPayload } from "@calcom/types/oauth";
import prisma from "@calcom/prisma";

/**
 * Calendar Authentication Guard
 * 
 * This guard validates OAuth access tokens for calendar API endpoints.
 * It follows the same pattern as the existing OAuth token validation in:
 * - apps/web/app/api/auth/oauth/refreshToken/route.ts
 * - apps/web/app/api/auth/oauth/token/route.ts
 * 
 * The guard:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Verifies the JWT signature using CALENDSO_ENCRYPTION_KEY
 * 3. Validates that it's an Access Token (not a Refresh Token)
 * 4. Attaches the decoded payload to the request for downstream use
 * 
 * Usage:
 * @UseGuards(CalendarAuthGuard)
 * async getCalendars(@Request() req) {
 *   const userId = req.user.userId;
 *   const teamId = req.user.teamId;
 *   // ... implementation
 * }
 */
@Injectable()
export class CalendarAuthGuard implements CanActivate {
  private readonly logger = new Logger(CalendarAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn("No authorization token provided");
      throw new UnauthorizedException("Authorization token is required");
    }

    try {
      const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;
      
      if (!secretKey) {
        this.logger.error("CALENDSO_ENCRYPTION_KEY is not configured");
        throw new UnauthorizedException("Server configuration error");
      }

      // Verify and decode the JWT token
      const payload = jwt.verify(token, secretKey) as OAuthTokenPayload;

      // Validate token type - must be an Access Token, not a Refresh Token
      if (!payload || payload.token_type !== "Access Token") {
        this.logger.warn(`Invalid token type: ${payload?.token_type}`);
        throw new UnauthorizedException("Invalid token type");
      }

      // Validate required fields
      if (!payload.userId || !payload.clientId) {
        this.logger.warn("Token missing required fields (userId or clientId)");
        throw new UnauthorizedException("Invalid token payload");
      }

      // Verify the OAuth client exists and is active
      const oAuthClient = await prisma.platformOAuthClient.findUnique({
        where: {
          id: payload.clientId,
        },
        select: {
          id: true,
          organizationId: true,
          enabled: true,
        },
      });

      if (!oAuthClient) {
        this.logger.warn(`OAuth client not found: ${payload.clientId}`);
        throw new UnauthorizedException("Invalid OAuth client");
      }

      if (!oAuthClient.enabled) {
        this.logger.warn(`OAuth client disabled: ${payload.clientId}`);
        throw new UnauthorizedException("OAuth client is disabled");
      }

      // Verify the user exists and is associated with the OAuth client
      const user = await prisma.user.findFirst({
        where: {
          id: payload.userId,
          oAuthClients: {
            some: {
              id: payload.clientId,
            },
          },
        },
        select: {
          id: true,
          email: true,
          username: true,
          timeZone: true,
          locale: true,
        },
      });

      if (!user) {
        this.logger.warn(
          `User not found or not associated with OAuth client. UserId: ${payload.userId}, ClientId: ${payload.clientId}`
        );
        throw new UnauthorizedException("User not found or unauthorized");
      }

      // Attach the validated payload and user info to the request
      // This makes it available to route handlers via @Request() decorator
      request["user"] = {
        userId: payload.userId,
        teamId: payload.teamId,
        clientId: payload.clientId,
        scope: payload.scope,
        email: user.email,
        username: user.username,
        timeZone: user.timeZone,
        locale: user.locale,
        organizationId: oAuthClient.organizationId,
      };

      this.logger.log(`Successfully authenticated user ${payload.userId} for client ${payload.clientId}`);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle JWT-specific errors
      if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn(`JWT verification failed: ${error.message}`);
        throw new UnauthorizedException("Invalid token");
      }

      if (error instanceof jwt.TokenExpiredError) {
        this.logger.warn(`Token expired at: ${error.expiredAt}`);
        throw new UnauthorizedException("Token has expired");
      }

      // Log unexpected errors
      this.logger.error(`Unexpected authentication error: ${error}`);
      throw new UnauthorizedException("Authentication failed");
    }
  }

  /**
   * Extracts the Bearer token from the Authorization header
   * Expected format: "Bearer <token>"
   * 
   * @param request - The incoming HTTP request
   * @returns The extracted token or undefined if not present
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(" ");
    
    if (type !== "Bearer" || !token) {
      this.logger.warn(`Invalid authorization header format: ${type}`);
      return undefined;
    }

    return token;
  }
}

/**
 * Extended Request interface with authenticated user information
 * Use this type in controllers to access the authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    teamId: number | null;
    clientId: string;
    scope: string[];
    email: string;
    username: string | null;
    timeZone: string;
    locale: string | null;
    organizationId: number | null;
  };
}


@UseGuards(CalendarAuthGuard)
@Get('calendars')
async getCalendars(@Request() req: AuthenticatedRequest) {
  const userId = req.user.userId;
  // ... implementation
}