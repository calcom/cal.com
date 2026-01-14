import { sha256Hash, isApiKey, stripApiKey } from "@/lib/api-key";
import type { AuthUser, UserRole } from "@/types/auth";
import { UnauthorizedError } from "@/utils/error";

import type { PrismaClient } from "@calcom/prisma";

export interface ApiKeyData {
  id: string;
  userId: number;
  teamId: number | null;
  expiresAt: Date | null;
  hashedKey: string;
  createdAt: Date;
}

export interface ApiKeyAuthResult {
  user: AuthUser;
  organizationId: number | null;
  apiKeyId: string;
}

export class ApiKeyStrategy {
  constructor(private prisma: PrismaClient, private apiKeyPrefix: string = "calid_") {}

  async authenticate(bearerToken: string): Promise<ApiKeyAuthResult> {
    try {
      // Check if it's a valid API key format
      if (!isApiKey(bearerToken, this.apiKeyPrefix)) {
        throw new UnauthorizedError("Invalid API key format");
      }

      // Strip the prefix and hash the key
      const strippedApiKey = stripApiKey(bearerToken, this.apiKeyPrefix);
      const apiKeyHash = sha256Hash(strippedApiKey);

      // Find the API key in database
      const apiKeyData = await this.getApiKeyFromHash(apiKeyHash);
      if (!apiKeyData) {
        throw new UnauthorizedError("Invalid API key");
      }

      // Check if key is expired
      if (this.isKeyExpired(apiKeyData)) {
        throw new UnauthorizedError("API key has expired");
      }

      // Get the user associated with this API key
      const user = await this.getUserByApiKey(apiKeyData.userId);
      if (!user) {
        throw new UnauthorizedError("No user associated with this API key");
      }

      return {
        user: this.mapToAuthUser(user),
        organizationId: apiKeyData.teamId,
        apiKeyId: apiKeyData.id,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError("API key authentication failed");
    }
  }

  private async getApiKeyFromHash(hashedKey: string): Promise<ApiKeyData | null> {
    try {
      const apiKey = await this.prisma.calIdApiKey.findFirst({
        where: {
          hashedKey,
        },
        select: {
          id: true,
          userId: true,
          teamId: true,
          expiresAt: true,
          hashedKey: true,
          createdAt: true,
        },
      });

      return apiKey;
    } catch (error) {
      throw new UnauthorizedError("Failed to validate API key");
    }
  }

  private async getUserByApiKey(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
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
      throw new UnauthorizedError("Failed to retrieve user for API key");
    }
  }

  private isKeyExpired(apiKeyData: ApiKeyData): boolean {
    if (!apiKeyData.expiresAt) {
      return false; // No expiration set
    }

    const now = new Date();
    const expirationDate = new Date(apiKeyData.expiresAt);

    // Set time to start of day for comparison
    now.setHours(0, 0, 0, 0);
    expirationDate.setHours(0, 0, 0, 0);

    return now > expirationDate;
  }

  private mapToAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
  }
}
