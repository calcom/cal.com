import type { AuthUser, UserRole } from "@/types";
import { UnauthorizedError } from "@/utils";

import type { PrismaClient } from "@calcom/prisma";

export interface AccessTokenAuthResult {
  user: AuthUser;
  organizationId: number | null;
  clientId: string;
}

export interface OAuthClient {
  id: string;
  organizationId: number;
  redirectUris: string[];
  secret: string;
  name: string;
}

export class AccessTokenStrategy {
  constructor(private prisma: PrismaClient) {}

  async authenticate(accessToken: string, origin?: string): Promise<AccessTokenAuthResult> {
    try {
      // Validate the access token format and expiration
      const isValid = await this.validateAccessToken(accessToken);
      if (!isValid) {
        throw new UnauthorizedError("Invalid or expired access token");
      }

      // Get the OAuth client associated with this token
      const client = await this.getAccessTokenClient(accessToken);
      if (!client) {
        throw new UnauthorizedError("OAuth client not found for access token");
      }

      // Validate origin if provided
      if (origin && !this.isOriginAllowed(origin, client.redirectUris)) {
        throw new UnauthorizedError(
          `Invalid request origin. Please add '${origin}' to the redirect URIs of OAuth client '${client.id}'`
        );
      }

      // Get the user who owns this access token
      const userId = await this.getAccessTokenOwnerId(accessToken);
      if (!userId) {
        throw new UnauthorizedError("No user associated with this access token");
      }

      const user = await this.getUserById(userId);
      if (!user) {
        throw new UnauthorizedError("User not found for access token");
      }

      // Get user's main organization ID
      const organizationId = this.getUserMainOrgId(user);

      return {
        user: this.mapToAuthUser(user),
        organizationId,
        clientId: client.id,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError("Access token authentication failed");
    }
  }

  private async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const token = await this.prisma.accessToken.findFirst({
        where: {
          secret: accessToken,
          expiresAt: {
            gt: new Date(), // Token must not be expired
          },
        },
      });

      return !!token;
    } catch (error) {
      return false;
    }
  }

  private async getAccessTokenClient(accessToken: string): Promise<OAuthClient | null> {
    try {
      const tokenWithClient = await this.prisma.accessToken.findFirst({
        where: { secret: accessToken },
        include: {
          client: true,
        },
      });

      return tokenWithClient?.client || null;
    } catch (error) {
      return null;
    }
  }

  private async getAccessTokenOwnerId(accessToken: string): Promise<number | null> {
    try {
      const token = await this.prisma.accessToken.findFirst({
        where: { secret: accessToken },
        select: { userId: true },
      });

      return token?.userId || null;
    } catch (error) {
      return null;
    }
  }

  private async getUserById(userId: string | number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(userId) },
        include: {
          profiles: {
            include: {
              organization: true,
            },
          },
        },
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  private getUserMainOrgId(user: any): number | null {
    // Find the main organization for the user
    const mainProfile = user.profiles?.find((profile: any) => profile.isDefault) || user.profiles?.[0];
    return mainProfile?.organizationId || null;
  }

  private isOriginAllowed(origin: string, allowedUris: string[]): boolean {
    try {
      const originUrl = new URL(origin);

      return allowedUris.some((uri) => {
        try {
          const allowedUrl = new URL(uri);
          return originUrl.origin === allowedUrl.origin;
        } catch {
          // If URI is not a valid URL, check if it matches exactly
          return origin === uri;
        }
      });
    } catch {
      // If origin is not a valid URL, check exact matches
      return allowedUris.includes(origin);
    }
  }

  private mapToAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
  }
}
