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
      throw new ErrorWithCode(ErrorCode.Unauthorized, "unauthorized_client");
    }

    // RFC 6749 4.1.2.1: Redirect URI mismatch on Auth step is 'invalid_request'
    this.validateRedirectUri(client.redirectUri, redirectUri);

    if (client.clientType === "PUBLIC") {
      if (!codeChallenge) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request");
      }
      if (!codeChallengeMethod || codeChallengeMethod !== "S256") {
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request");
      }
    } else if (client.clientType === "CONFIDENTIAL") {
      if (codeChallenge && (!codeChallengeMethod || codeChallengeMethod !== "S256")) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request");
      }
    }

    let teamId: number | undefined;
    if (teamSlug) {
      const team = await this.teamsRepository.findTeamBySlugWithAdminRole(teamSlug, userId);
      if (!team) {
        // Specific OAuth error for user denying or failing permission
        throw new ErrorWithCode(ErrorCode.Unauthorized, "access_denied");
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
      throw new ErrorWithCode(ErrorCode.BadRequest, "invalid_request");
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
        return { error: error.message };
      }

      switch (error.code) {
        case ErrorCode.BadRequest:
          return { error: "invalid_request", errorDescription: error.message };
        case ErrorCode.Unauthorized:
          return { error: "unauthorized_client", errorDescription: error.message };
        default:
          return { error: "server_error", errorDescription: error.message };
      }
    }

    return {
      error: "server_error",
      errorDescription: "An unexpected error occurred",
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

    // RFC 6749 5.2: Redirect URI mismatch during Token exchange is 'invalid_grant'
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
      // RFC 7636 4.4.1: If verification fails, return 'invalid_grant'
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

    // Structural missing params
    if (!source.codeChallenge || !codeVerifier || method !== "S256") {
      return "invalid_request";
    }

    // Logical mismatch
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
      throw new ErrorWithCode(ErrorCode.InternalServerError, "server_error");
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
      throw new ErrorWithCode(ErrorCode.InternalServerError, "server_error");
    }

    try {
      const decoded = jwt.verify(refreshToken, secretKey) as DecodedRefreshToken;
      return decoded;
    } catch {
      return null;
    }
  }
}
