import { OAuth2Repository } from "@/modules/auth/oauth2/oauth2.repository";
import { AccessCodeRepository } from "@/modules/auth/oauth2/repositories/access-code.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import * as jwt from "jsonwebtoken";

import { generateSecret, verifyCodeChallenge } from "@calcom/platform-libraries";
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

interface DecodedRefreshToken {
  userId?: number | null;
  teamId?: number | null;
  scope: AccessScope[];
  tokenType: string;
  clientId: string;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
}

@Injectable()
export class OAuth2Service {
  constructor(
    private readonly oauth2Repository: OAuth2Repository,
    private readonly accessCodeRepository: AccessCodeRepository,
    private readonly teamsRepository: TeamsRepository,
    private readonly configService: ConfigService
  ) {}

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
      const team = await this.teamsRepository.findTeamBySlugWithAdminRole(teamSlug, userId);
      if (!team) {
        throw new UnauthorizedException("Team not found or user is not an admin/owner");
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

    if (!this.validateClient(client, clientSecret)) {
      throw new UnauthorizedException("invalid_client");
    }

    const accessCode = await this.accessCodeRepository.findValidCode(code, clientId);

    await this.accessCodeRepository.deleteExpiredAndUsedCodes(code, clientId);

    if (!accessCode) {
      throw new BadRequestException("invalid_grant");
    }

    const pkceError = this.verifyPKCE(client, accessCode, codeVerifier);
    if (pkceError) {
      throw new BadRequestException(pkceError);
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
    clientSecret?: string,
    codeVerifier?: string
  ): Promise<OAuth2Tokens> {
    const client = await this.oauth2Repository.findByClientIdWithSecret(clientId);

    if (!client) {
      throw new UnauthorizedException("invalid_client");
    }

    if (!this.validateClient(client, clientSecret)) {
      throw new UnauthorizedException("invalid_client");
    }

    const decodedToken = this.verifyRefreshToken(refreshToken);

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

    const tokens = this.createTokens({
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
    const secretKey = this.configService.get<string>("CALENDSO_ENCRYPTION_KEY");
    if (!secretKey) {
      throw new InternalServerErrorException("CALENDSO_ENCRYPTION_KEY is not set");
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
    const secretKey = this.configService.get<string>("CALENDSO_ENCRYPTION_KEY");
    if (!secretKey) {
      throw new InternalServerErrorException("CALENDSO_ENCRYPTION_KEY is not set");
    }

    try {
      const decoded = jwt.verify(refreshToken, secretKey) as DecodedRefreshToken;
      return decoded;
    } catch {
      return null;
    }
  }
}
