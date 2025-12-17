import { OAuth2Repository } from "@/modules/auth/oauth2/oauth2.repository";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";

import type { AccessScope } from "@calcom/prisma/enums";

export interface OAuth2Client {
  clientId: string;
  redirectUri: string;
  name: string;
  logo: string | null;
  isTrusted: boolean;
}

export interface OAuth2Tokens {
  accessToken: string;
  tokenType: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthorizeResult {
  authorizationCode: string;
}

@Injectable()
export class OAuth2Service {
  constructor(private readonly oauth2Repository: OAuth2Repository) {}

  async getClient(clientId: string): Promise<OAuth2Client | null> {
    const client = await this.oauth2Repository.findByClientId(clientId);

    if (!client) {
      return null;
    }

    return {
      clientId: client.clientId,
      redirectUri: client.redirectUri,
      name: client.name,
      logo: client.logo,
      isTrusted: client.isTrusted,
    };
  }

  async generateAuthorizationCode(
    clientId: string,
    userId: number,
    scopes: AccessScope[],
    teamSlug?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string
  ): Promise<AuthorizeResult> {
    const client = await this.oauth2Repository.findByClientIdWithType(clientId);

    if (!client) {
      throw new UnauthorizedException("Client ID not valid");
    }

    if (client.clientType === "PUBLIC") {
      if (!codeChallenge) {
        throw new BadRequestException("code_challenge required for public clients");
      }
      if (!codeChallengeMethod || codeChallengeMethod !== "S256") {
        throw new BadRequestException("code_challenge_method must be S256 for public clients");
      }
    } else if (client.clientType === "CONFIDENTIAL") {
      if (codeChallenge && (!codeChallengeMethod || codeChallengeMethod !== "S256")) {
        throw new BadRequestException("code_challenge_method must be S256 when PKCE is used");
      }
    }

    let teamId: number | undefined;
    if (teamSlug) {
      const team = await this.oauth2Repository.findTeamBySlugAndUserId(teamSlug, userId);
      if (!team) {
        throw new UnauthorizedException("Team not found or user is not an admin/owner");
      }
      teamId = team.id;
    }

    const authorizationCode = await this.oauth2Repository.createAccessCode({
      clientId,
      userId: teamSlug ? undefined : userId,
      teamId,
      scopes,
      codeChallenge,
      codeChallengeMethod,
    });

    return { authorizationCode };
  }

  async exchangeCodeForTokens(
    clientId: string,
    code: string,
    clientSecret?: string,
    redirectUri?: string,
    codeVerifier?: string
  ): Promise<OAuth2Tokens> {
    const client = await this.oauth2Repository.findByClientIdWithSecret(clientId);

    if (!client) {
      throw new UnauthorizedException("invalid_client");
    }

    if (redirectUri && client.redirectUri !== redirectUri) {
      throw new BadRequestException("invalid_grant");
    }

    const isValidClient = this.validateClient(client, clientSecret);
    if (!isValidClient) {
      throw new UnauthorizedException("invalid_client");
    }

    const accessCode = await this.oauth2Repository.findValidAccessCode(code, clientId);

    await this.oauth2Repository.deleteExpiredAndUsedCodes(code, clientId);

    if (!accessCode) {
      throw new BadRequestException("invalid_grant");
    }

    const pkceError = this.verifyPKCE(client, accessCode, codeVerifier);
    if (pkceError) {
      throw new BadRequestException(pkceError);
    }

    const tokens = await this.oauth2Repository.createTokens({
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
    clientSecret?: string,
    codeVerifier?: string
  ): Promise<OAuth2Tokens> {
    const client = await this.oauth2Repository.findByClientIdWithSecret(clientId);

    if (!client) {
      throw new UnauthorizedException("invalid_client");
    }

    const isValidClient = this.validateClient(client, clientSecret);
    if (!isValidClient) {
      throw new UnauthorizedException("invalid_client");
    }

    const decodedToken = await this.oauth2Repository.verifyRefreshToken(refreshToken);

    if (!decodedToken || decodedToken.tokenType !== "Refresh Token") {
      throw new BadRequestException("invalid_grant");
    }

    if (decodedToken.clientId !== clientId) {
      throw new BadRequestException("invalid_grant");
    }

    const pkceError = this.verifyPKCE(client, decodedToken, codeVerifier);
    if (pkceError) {
      throw new BadRequestException(pkceError);
    }

    const tokens = await this.oauth2Repository.createTokens({
      clientId,
      userId: decodedToken.userId,
      teamId: decodedToken.teamId,
      scopes: decodedToken.scope,
      codeChallenge: decodedToken.codeChallenge,
      codeChallengeMethod: decodedToken.codeChallengeMethod,
    });

    return tokens;
  }

  private validateClient(
    client: { clientType: string; clientSecret?: string | null },
    clientSecret?: string
  ): boolean {
    if (client.clientType === "CONFIDENTIAL") {
      if (!clientSecret) return false;
      // TODO: Implement proper secret validation with hashing
      // For now, this is a skeleton - actual implementation should use generateSecret from trpc handler
      return true;
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

    // TODO: Implement proper PKCE verification using verifyCodeChallenge from @calcom/lib/pkce
    // For now, this is a skeleton
    return null;
  }
}
