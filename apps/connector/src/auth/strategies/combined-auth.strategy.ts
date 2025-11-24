import { AccessTokenStrategy } from "@/auth/strategies/access-token.strategy";
import { ApiKeyStrategy } from "@/auth/strategies/api-key.strategy";
import { isApiKey } from "@/lib/api-key";
import type { AuthUser } from "@/types";
import { UnauthorizedError } from "@/utils";

import type { PrismaClient } from "@calcom/prisma";

export enum AuthMethods {
  API_KEY = "API_KEY",
  ACCESS_TOKEN = "ACCESS_TOKEN",
  OAUTH_CLIENT = "OAUTH_CLIENT",
  NEXT_AUTH = "NEXT_AUTH",
  THIRD_PARTY_ACCESS_TOKEN = "THIRD_PARTY_ACCESS_TOKEN",
}

export type AllowedAuthMethod = keyof typeof AuthMethods;

export interface AuthResult {
  user: AuthUser;
  authMethod: AuthMethods;
  organizationId: number | null;
  clientId?: string;
  apiKeyId?: string;
}

export class CombinedAuthStrategy {
  private apiKeyStrategy: ApiKeyStrategy;
  private accessTokenStrategy: AccessTokenStrategy;

  constructor(
    private prisma: PrismaClient,
    private config: {
      apiKeyPrefix: string;
      jwt_secret: string;
    }
  ) {
    this.apiKeyStrategy = new ApiKeyStrategy(prisma, config.apiKeyPrefix);
    this.accessTokenStrategy = new AccessTokenStrategy(prisma, config.jwt_secret);
  }

  async authenticate(
    bearerToken: string,
    origin?: string,
    allowedMethods?: AllowedAuthMethod[]
  ): Promise<AuthResult> {
    const noSpecificAuthExpected = !allowedMethods || allowedMethods.length === 0;
    const apiKeyAllowed = noSpecificAuthExpected || allowedMethods.includes("API_KEY");
    const accessTokenAllowed = noSpecificAuthExpected || allowedMethods.includes("ACCESS_TOKEN");

    // Try API Key authentication first if it looks like an API key
    if (isApiKey(bearerToken, this.config.apiKeyPrefix)) {
      if (!apiKeyAllowed) {
        throw new UnauthorizedError("API key authentication not allowed for this endpoint");
      }
      try {
        const result = await this.apiKeyStrategy.authenticate(bearerToken);
        return {
          user: result.user,
          authMethod: AuthMethods.API_KEY,
          organizationId: result.organizationId,
          apiKeyId: result.apiKeyId,
        };
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          throw error;
        }
        throw new UnauthorizedError("API key authentication failed");
      }
    }

    // Try Access Token authentication
    if (accessTokenAllowed) {
      try {
        const result = await this.accessTokenStrategy.authenticate(bearerToken, origin);
        return {
          user: result.user,
          authMethod: AuthMethods.ACCESS_TOKEN,
          organizationId: result.organizationId,
          clientId: result.clientId,
        };
      } catch (error) {
        console.log("Access token authentication failed", error);
        if (error instanceof UnauthorizedError && apiKeyAllowed) {
          // If access token failed and API key is allowed, the error might be misleading
          throw new UnauthorizedError("Invalid bearer token");
        }
        throw error;
      }
    }

    throw new UnauthorizedError("No valid authentication method found");
  }
}
