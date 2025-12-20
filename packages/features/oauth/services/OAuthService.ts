import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";

import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { AccessCodeRepository } from "@calcom/features/oauth/repositories/AccessCodeRepository";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { generateSecret } from "@calcom/features/oauth/utils/generateSecret";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { verifyCodeChallenge } from "@calcom/lib/pkce";
import type { AccessScope, OAuthClientType } from "@calcom/prisma/enums";

export interface OAuth2Client {
  clientId: string;
  redirectUri: string;
  name: string;
  logo: string | null;
  isTrusted: boolean;
  clientType: OAuthClientType;
}

export interface OAuth2Tokens {
  accessToken: string;
  tokenType: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthorizeResult {
  redirectUrl: string;
  authorizationCode: string;
  client: OAuth2Client;
}

export interface OAuthError {
  error: string;
  errorDescription?: string;
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
  constructor(
    private readonly deps: {
      oAuthClientRepository: OAuthClientRepository;
      accessCodeRepository: AccessCodeRepository;
      teamsRepository: TeamRepository;
    }
  ) {
    this.accessCodeRepository = deps.accessCodeRepository;
    this.teamsRepository = deps.teamsRepository;
    this.oAuthClientRepository = deps.oAuthClientRepository;
  }

  async getClient(clientId: string): Promise<OAuth2Client> {
    const client = await this.oAuthClientRepository.findByClientId(clientId);

    if (!client) {
      throw new ErrorWithCode(ErrorCode.NotFound, `OAuth client with ID '${clientId}' not found`);
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
      throw new ErrorWithCode(ErrorCode.Unauthorized, "Client ID not valid");
    }

    this.validateRedirectUri(client.redirectUri, redirectUri);

    if (client.clientType === "PUBLIC") {
      if (!codeChallenge) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "code_challenge required for public clients");
      }
      if (!codeChallengeMethod || codeChallengeMethod !== "S256") {
        throw new ErrorWithCode(ErrorCode.BadRequest, "code_challenge_method must be S256 for public clients");
      }
    } else if (client.clientType === "CONFIDENTIAL") {
      if (codeChallenge && (!codeChallengeMethod || codeChallengeMethod !== "S256")) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "code_challenge_method must be S256 when PKCE is used");
      }
    }

    let teamId: number | undefined;
    if (teamSlug) {
      const team = await this.teamsRepository.findTeamBySlugWithAdminRole(teamSlug, userId);
      if (!team) {
        throw new ErrorWithCode(ErrorCode.Unauthorized, "Team not found or user is not an admin/owner");
      }
      teamId = team.id;
    }

    const authorizationCode = this.generateAuthorizationCodeString();

    await this.accessCodeRepository.create({
      code: authorizationCode,
      clientId,
      userId: teamSlug ? undefined : userId,
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
      throw new ErrorWithCode(ErrorCode.BadRequest, "redirect_uri does not match registered redirect URI");
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
    if (error instanceof ErrorWithCode && error.code === ErrorCode.BadRequest) {
      return {
        error: "invalid_request",
        errorDescription: error.message,
      };
    }
    if (error instanceof ErrorWithCode && error.code === ErrorCode.Unauthorized) {
      return {
        error: "unauthorized_client",
        errorDescription: error.message,
      };
    }
    return {
      error: "server_error",
      errorDescription: error instanceof ErrorWithCode ? error.message : "An unexpected error occurred",
    };
  }

  async exchangeCodeForTokens(
    clientId: string,
    code: string,
    clientSecret?: string,
    redirectUri?: string,
    codeVerifier?: string
  ): Promise<OAuth2Tokens> {
    const client = await this.oAuthClientRepository.findByClientIdWithSecret(clientId);
    if (!client) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client");
    }

    if (redirectUri && client.redirectUri !== redirectUri) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant");
    }

    if (!this.validateClient(client, clientSecret)) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client");
    }

    const accessCode = await this.accessCodeRepository.findValidCode(code, clientId);

    await this.accessCodeRepository.deleteExpiredAndUsedCodes(code, clientId);

    if (!accessCode) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant");
    }

    const pkceError = this.verifyPKCE(client, accessCode, codeVerifier);
    if (pkceError) {
      throw new ErrorWithCode(ErrorCode.BadRequest, pkceError);
    }

    const tokens = this.createTokens({
      clientId,
      userId: accessCode.userId,
      teamId: accessCode.teamId,
      scopes: accessCode.scopes,
      codeChallenge: accessCode.codeChallenge,
      codeChallengeMethod: accessCode.codeChallengeMethod,
    });

    return tokens;
  }

  async refreshAccessToken(
    clientId: string,
    refreshToken: string,
    clientSecret?: string
  ): Promise<OAuth2Tokens> {
    const client = await this.oAuthClientRepository.findByClientIdWithSecret(clientId);

    if (!client) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client");
    }

    if (!this.validateClient(client, clientSecret)) {
      throw new ErrorWithCode(ErrorCode.Unauthorized, "invalid_client");
    }

    const decodedToken = this.verifyRefreshToken(refreshToken);

    if (!decodedToken || decodedToken.token_type !== "Refresh Token") {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant");
    }

    if (decodedToken.clientId !== clientId) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_grant");
    }

    const tokens = this.createTokens({
      clientId,
      userId: decodedToken.userId,
      teamId: decodedToken.teamId,
      scopes: decodedToken.scope,
    });

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
  ): string | null {
    const shouldEnforcePKCE =
      client.clientType === "PUBLIC" || (client.clientType === "CONFIDENTIAL" && source.codeChallenge);

    if (!shouldEnforcePKCE) return null;

    const method = source.codeChallengeMethod || "S256";

    if (!source.codeChallenge || !codeVerifier || method !== "S256") {
      return "invalid_request";
    }

    if (!verifyCodeChallenge(codeVerifier, source.codeChallenge, method)) {
      return "invalid_grant";
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
      throw new ErrorWithCode(ErrorCode.InternalServerError, "CALENDSO_ENCRYPTION_KEY is not set");
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
      throw new ErrorWithCode(ErrorCode.InternalServerError, "CALENDSO_ENCRYPTION_KEY is not set");
    }

    try {
      const decoded = jwt.verify(refreshToken, secretKey) as DecodedRefreshToken;
      return decoded;
    } catch {
      return null;
    }
  }
}
