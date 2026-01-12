import { randomBytes } from "node:crypto";
import process from "node:process";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import type { AccessCodeRepository } from "@calcom/features/oauth/repositories/AccessCodeRepository";
import type { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import type { RefreshTokenRepository } from "@calcom/features/oauth/repositories/RefreshTokenRepository";
import { generateSecret } from "@calcom/features/oauth/utils/generateSecret";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { verifyCodeChallenge } from "@calcom/lib/pkce";
import { prisma } from "@calcom/prisma";
import type { AccessScope, OAuthClientType } from "@calcom/prisma/enums";
import jwt from "jsonwebtoken";

interface OAuth2Client {
  clientId: string;
  redirectUri: string;
  name: string;
  logo: string | null;
  isTrusted: boolean;
  clientType: OAuthClientType;
}

interface OAuth2Tokens {
  accessToken: string;
  tokenType: string;
  refreshToken: string;
  expiresIn: number;
}

interface DecodedRefreshToken {
  userId?: number | null;
  teamId?: number | null;
  scope: AccessScope[];
  token_type: string;
  clientId: string;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}

export class OAuthService {
  private readonly accessCodeRepository: AccessCodeRepository;
  private readonly teamsRepository: TeamRepository;
  private readonly oAuthClientRepository: OAuthClientRepository;
  private readonly refreshTokenRepository: RefreshTokenRepository;
  constructor(
    readonly deps: {
      oAuthClientRepository: OAuthClientRepository;
      accessCodeRepository: AccessCodeRepository;
      teamsRepository: TeamRepository;
      refreshTokenRepository: RefreshTokenRepository;
    }
  ) {
    this.accessCodeRepository = deps.accessCodeRepository;
    this.teamsRepository = deps.teamsRepository;
    this.oAuthClientRepository = deps.oAuthClientRepository;
    this.refreshTokenRepository = deps.refreshTokenRepository;
  }

  async getClient(clientId: string): Promise<OAuth2Client> {
    const client = await this.oAuthClientRepository.findByClientId(clientId);

    if (!client) {
      throw new ErrorWithCode(ErrorCode.NotFound, "unauthorized_client");
    }

    return {
      clientId: client.clientId,
      redirectUri: client.redirectUri,
      name: client.name,
      logo: client.logo,
      isTrusted: client.isTrusted,
      clientType: client.clientType,
    };
  }

  async generateAuthorizationCode(
    clientId: string,
    userId: number,
    redirectUri: string,
    scopes: AccessScope[],
    state?: string,
    teamSlug?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string
  ): Promise<AuthorizeResult> {
    const client = await this.oAuthClientRepository.findByClientId(clientId);

    if (!client) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "unauthorized_client", { reason: "client_not_found" });
    }

    // RFC 6749 4.1.2.1: Redirect URI mismatch on Auth step is 'invalid_request'
    this.validateRedirectUri(client.redirectUri, redirectUri);

    if (client.clientType === "PUBLIC") {
      if (!codeChallenge) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request", { reason: "pkce_required" });
      }
      if (!codeChallengeMethod || codeChallengeMethod !== "S256") {
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request", {
          reason: "invalid_code_challenge_method",
        });
      }
    } else if (client.clientType === "CONFIDENTIAL") {
      if (codeChallenge && (!codeChallengeMethod || codeChallengeMethod !== "S256")) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request", {
          reason: "invalid_code_challenge_method",
        });
      }
    }

    let teamId: number | undefined;
    if (teamSlug) {
      const team = await this.teamsRepository.findTeamBySlugWithAdminRole(teamSlug, userId);
      if (!team) {
        // Specific OAuth error for user denying or failing permission
        throw new ErrorWithCode(ErrorCode.Unauthorized, "access_denied", {
          reason: "team_not_found_or_no_access",
        });
      }
      teamId = team.id;
    }

    const authorizationCode = this.generateAuthorizationCodeString();

    let finalUserId: number | undefined = userId;
    if (teamSlug) {
      finalUserId = undefined;
    }

    await this.accessCodeRepository.create({
      code: authorizationCode,
      clientId,
      userId: finalUserId,
      teamId,
      scopes,
      codeChallenge,
      codeChallengeMethod,
    });

    const redirectUrl = this.buildRedirectUrl(redirectUri, {
      code: authorizationCode,
      state,
    });

    return { redirectUrl, authorizationCode, client };
  }

  private validateRedirectUri(registeredUri: string, providedUri: string): void {
    if (providedUri !== registeredUri) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request", { reason: "redirect_uri_mismatch" });
    }
  }

  buildRedirectUrl(baseUrl: string, params: Record<string, string | undefined>): string {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  buildErrorRedirectUrl(redirectUri: string, error: unknown, state?: string): string {
    const oauthError = this.mapErrorToOAuthError(error);
    return this.buildRedirectUrl(redirectUri, {
      error: oauthError.error,
      error_description: oauthError.errorDescription,
      state,
    });
  }

  private mapErrorToOAuthError(error: unknown): OAuthError {
    const validOAuthErrors = [
      "invalid_request",
      "unauthorized_client",
      "access_denied",
      "unsupported_response_type",
      "invalid_scope",
      "server_error",
      "temporarily_unavailable",
      "invalid_client",
      "invalid_grant",
    ];

    if (error instanceof ErrorWithCode) {
      if (validOAuthErrors.includes(error.message)) {
        return {
          error: error.message,
          errorDescription: (error.data?.cause as string | undefined) ?? error.message,
        };
      }

      switch (error.code) {
        case ErrorCode.BadRequest:
          return {
            error: "invalid_request",
            errorDescription: (error.data?.cause as string | undefined) ?? error.message,
          };
        case ErrorCode.Unauthorized:
          return {
            error: "unauthorized_client",
            errorDescription: (error.data?.cause as string | undefined) ?? error.message,
          };
        default:
          return {
            error: "server_error",
            errorDescription: (error.data?.cause as string | undefined) ?? error.message,
          };
      }
    }

    return {
      error: "server_error",
      errorDescription: "An unexpected error occurred",
    };
  }

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: Token exchange requires multiple validation steps
  async exchangeCodeForTokens(
    clientId: string,
    code: string,
    clientSecret?: string,
    redirectUri?: string,
    codeVerifier?: string
  ): Promise<OAuth2Tokens> {
    const client = await this.oAuthClientRepository.findByClientIdWithSecret(clientId);
    if (!client) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client", { reason: "client_not_found" });
    }

    // RFC 6749 5.2: Redirect URI mismatch during Token exchange is 'invalid_grant'
    if (redirectUri && client.redirectUri !== redirectUri) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", { reason: "redirect_uri_mismatch" });
    }

    if (!this.validateClient(client, clientSecret)) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client", {
        reason: "invalid_client_credentials",
      });
    }

    const accessCode = await this.accessCodeRepository.findValidCode(code, clientId);

    await this.accessCodeRepository.deleteExpiredAndUsedCodes(code, clientId);

    if (!accessCode) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", { reason: "code_invalid_or_expired" });
    }

    const pkceError = this.verifyPKCE(client, accessCode, codeVerifier);
    if (pkceError) {
      // RFC 7636 4.4.1: If verification fails, return 'invalid_grant'
      throw new ErrorWithCode(ErrorCode.BadRequest, pkceError.error, { reason: pkceError.reason });
    }

    const userId = accessCode.userId;
    if (!userId) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", { reason: "user_id_required" });
    }

    const tokens = this.createTokens({
      clientId,
      userId: accessCode.userId,
      teamId: accessCode.teamId,
      scopes: accessCode.scopes,
      codeChallenge: accessCode.codeChallenge,
      codeChallengeMethod: accessCode.codeChallengeMethod,
    });

    // Store refresh token in database if PlatformOAuthClient exists
    const platformOAuthClientId = await this.findPlatformOAuthClientId(clientId, userId);
    if (platformOAuthClientId) {
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30); // 30 days

      try {
        await this.refreshTokenRepository.create({
          secret: tokens.refreshToken,
          userId,
          platformOAuthClientId,
          expiresAt: refreshTokenExpiresAt,
        });
      } catch (error) {
        // If storage fails, log but don't fail the request
        // This allows graceful degradation for OAuth clients without PlatformOAuthClient
        console.error("Failed to store refresh token in database:", error);
      }
    }

    return tokens;
  }

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: Token refresh requires validation, DB check, and rotation
  async refreshAccessToken(
    clientId: string,
    refreshToken: string,
    clientSecret?: string
  ): Promise<OAuth2Tokens> {
    const client = await this.oAuthClientRepository.findByClientIdWithSecret(clientId);

    if (!client) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client", { reason: "client_not_found" });
    }

    if (!this.validateClient(client, clientSecret)) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client", {
        reason: "invalid_client_credentials",
      });
    }

    const decodedToken = this.verifyRefreshToken(refreshToken);

    if (!decodedToken || decodedToken.token_type !== "Refresh Token") {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", { reason: "invalid_refresh_token" });
    }

    if (decodedToken.clientId !== clientId) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", { reason: "client_id_mismatch" });
    }

    const userId = decodedToken.userId;
    if (!userId) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", { reason: "user_id_required" });
    }

    // Check if refresh token exists in database (Solution 1: DELETE on Refresh)
    const platformOAuthClientId = await this.findPlatformOAuthClientId(clientId, userId);
    if (platformOAuthClientId) {
      const existingToken = await this.refreshTokenRepository.findBySecret(refreshToken);

      if (!existingToken) {
        // Token not found in database - it was already used or revoked
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", {
          reason: "refresh_token_already_used",
        });
      }

      // Verify token belongs to correct user and client
      if (existingToken.userId !== userId || existingToken.platformOAuthClientId !== platformOAuthClientId) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant", {
          reason: "refresh_token_mismatch",
        });
      }
    }

    const tokens = this.createTokens({
      clientId,
      userId: decodedToken.userId,
      teamId: decodedToken.teamId,
      scopes: decodedToken.scope,
    });

    // Delete old refresh token and store new one in database (Solution 1: DELETE on Refresh)
    if (platformOAuthClientId) {
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 30); // 30 days

      try {
        await this.refreshTokenRepository.deleteAndCreate(refreshToken, {
          secret: tokens.refreshToken,
          userId,
          platformOAuthClientId,
          expiresAt: refreshTokenExpiresAt,
        });
      } catch (error) {
        // Token rotation must succeed to prevent reuse attacks
        console.error("Failed to rotate refresh token in database:", error);
        throw new ErrorWithCode(ErrorCode.InternalServerError, "server_error", {
          reason: "token_rotation_failed",
        });
      }
    }

    return tokens;
  }

  private validateClient(
    client: { clientType: string; clientSecret?: string | null },
    clientSecret?: string
  ): boolean {
    if (client.clientType === "CONFIDENTIAL") {
      if (!clientSecret) return false;

      const [hashedSecret] = generateSecret(clientSecret);
      if (client.clientSecret !== hashedSecret) return false;
    }
    return true;
  }

  private verifyPKCE(
    client: { clientType: string },
    source: { codeChallenge?: string | null; codeChallengeMethod?: string | null },
    codeVerifier?: string
  ): {
    error: "invalid_request" | "invalid_grant";
    reason: "pkce_missing_parameters_or_invalid_method" | "pkce_verification_failed";
  } | null {
    const shouldEnforcePKCE =
      client.clientType === "PUBLIC" || (client.clientType === "CONFIDENTIAL" && source.codeChallenge);

    if (!shouldEnforcePKCE) return null;

    const method = source.codeChallengeMethod || "S256";

    // Structural missing params
    if (!source.codeChallenge || !codeVerifier || method !== "S256") {
      return { error: "invalid_request", reason: "pkce_missing_parameters_or_invalid_method" };
    }

    // Logical mismatch
    if (!verifyCodeChallenge(codeVerifier, source.codeChallenge, method)) {
      return { error: "invalid_grant", reason: "pkce_verification_failed" };
    }

    return null;
  }

  private generateAuthorizationCodeString(): string {
    const randomBytesValue = randomBytes(40);
    return randomBytesValue.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  private createTokens(input: {
    clientId: string;
    userId?: number | null;
    teamId?: number | null;
    scopes: AccessScope[];
    codeChallenge?: string | null;
    codeChallengeMethod?: string | null;
  }): OAuth2Tokens {
    const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new ErrorWithCode(ErrorCode.InternalServerError, "server_error", {
        reason: "encryption_key_missing",
      });
    }

    const accessTokenPayload = {
      userId: input.userId,
      teamId: input.teamId,
      scope: input.scopes,
      token_type: "Access Token",
      clientId: input.clientId,
    };

    const refreshTokenPayload = {
      userId: input.userId,
      teamId: input.teamId,
      scope: input.scopes,
      token_type: "Refresh Token",
      clientId: input.clientId,
      ...(input.codeChallenge && {
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: input.codeChallengeMethod,
      }),
    };

    const accessTokenExpiresIn = 1800; // 30 minutes

    const accessToken = jwt.sign(accessTokenPayload, secretKey, {
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = jwt.sign(refreshTokenPayload, secretKey, {
      expiresIn: 30 * 24 * 60 * 60, // 30 days
    });

    return {
      accessToken,
      tokenType: "bearer",
      refreshToken,
      expiresIn: accessTokenExpiresIn,
    };
  }

  private verifyRefreshToken(refreshToken: string): DecodedRefreshToken | null {
    const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!secretKey) {
      throw new ErrorWithCode(ErrorCode.InternalServerError, "server_error", {
        reason: "encryption_key_missing",
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, secretKey) as DecodedRefreshToken;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Finds or creates PlatformOAuthClient ID for a given OAuthClient ID.
   * Since OAuthClient and PlatformOAuthClient are separate systems,
   * we try to find a PlatformOAuthClient by matching the ID.
   * If not found and userId is provided, we create one using the user's organization.
   * Returns null if no PlatformOAuthClient can be found or created.
   */
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: Complex logic for finding/creating PlatformOAuthClient with fallbacks
  private async findPlatformOAuthClientId(
    oauthClientId: string,
    userId?: number | null
  ): Promise<string | null> {
    try {
      // Try to find PlatformOAuthClient by ID matching OAuthClient ID
      let platformClient = await prisma.platformOAuthClient.findUnique({
        where: {
          id: oauthClientId,
        },
        select: {
          id: true,
        },
      });

      if (platformClient) {
        return platformClient.id;
      }

      // If not found and we have a userId, try to create one using user's organization
      if (userId) {
        // Get user's organization
        let userOrg = await prisma.membership.findFirst({
          where: {
            userId,
            team: {
              isOrganization: true,
            },
          },
          select: {
            teamId: true,
          },
        });

        // If user doesn't have an organization, create a default one
        if (!userOrg) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, name: true },
          });

          if (user) {
            // Create a default organization for the user
            const defaultOrg = await prisma.team.create({
              data: {
                name: `${user.name || user.username || "User"}'s Organization`,
                slug: `org-${userId}-${Date.now()}`,
                isOrganization: true,
                members: {
                  create: {
                    userId,
                    role: "OWNER",
                    accepted: true,
                  },
                },
              },
              select: {
                id: true,
              },
            });

            userOrg = { teamId: defaultOrg.id };
          }
        }

        if (userOrg) {
          // Get OAuthClient details for creating PlatformOAuthClient
          const oauthClient = await prisma.oAuthClient.findUnique({
            where: {
              clientId: oauthClientId,
            },
            select: {
              name: true,
              redirectUri: true,
            },
          });

          if (oauthClient) {
            // Create PlatformOAuthClient with same ID as OAuthClient
            // Generate a secret for PlatformOAuthClient (required field)
            const platformSecret = randomBytes(32).toString("hex");

            try {
              platformClient = await prisma.platformOAuthClient.create({
                data: {
                  id: oauthClientId, // Use same ID as OAuthClient
                  name: oauthClient.name,
                  secret: platformSecret,
                  permissions: 0, // Default permissions
                  redirectUris: [oauthClient.redirectUri],
                  organizationId: userOrg.teamId,
                },
                select: {
                  id: true,
                },
              });

              return platformClient.id;
            } catch {
              // If creation fails (e.g., ID already exists), try to find it again
              platformClient = await prisma.platformOAuthClient.findUnique({
                where: {
                  id: oauthClientId,
                },
                select: {
                  id: true,
                },
              });

              if (platformClient) {
                return platformClient.id;
              }
            }
          }
        }
      }

      return null;
    } catch {
      // If lookup fails, return null (graceful degradation)
      return null;
    }
  }
}

export type OAuthErrorReason =
  | "client_not_found"
  | "redirect_uri_mismatch"
  | "pkce_required"
  | "invalid_code_challenge_method"
  | "team_not_found_or_no_access"
  | "access_denied"
  | "invalid_client_credentials"
  | "code_invalid_or_expired"
  | "pkce_missing_parameters_or_invalid_method"
  | "pkce_verification_failed"
  | "invalid_refresh_token"
  | "client_id_mismatch"
  | "encryption_key_missing"
  | "user_id_required"
  | "refresh_token_already_used"
  | "refresh_token_mismatch";

// Mapping of OAuth error reasons to descriptive messages, keeping previous messages for compatibility
export const OAUTH_ERROR_REASONS: Record<OAuthErrorReason, string> = {
  client_not_found: "OAuth client with ID not found",
  redirect_uri_mismatch: "redirect_uri does not match registered redirect URI",
  pkce_required: "code_challenge required for public clients",
  invalid_code_challenge_method: "code_challenge_method must be S256",
  team_not_found_or_no_access: "Team not found or user is not an admin/owner",
  access_denied: "The resource owner or authorization server denied the request.",
  invalid_client_credentials: "invalid_client",
  code_invalid_or_expired: "invalid_grant",
  pkce_missing_parameters_or_invalid_method: "invalid_request",
  pkce_verification_failed: "invalid_grant",
  invalid_refresh_token: "invalid_grant",
  client_id_mismatch: "invalid_grant",
  encryption_key_missing: "CALENDSO_ENCRYPTION_KEY is not set",
  user_id_required: "User ID is required for token operations",
  refresh_token_already_used: "Refresh token has already been used",
  refresh_token_mismatch: "Refresh token does not match user or client",
};

export interface AuthorizeResult {
  redirectUrl: string;
  authorizationCode: string;
  client: OAuth2Client;
}

export interface OAuthError {
  error: string;
  errorDescription?: string;
}
