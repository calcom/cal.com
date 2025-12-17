import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

import dayjs from "@calcom/dayjs";
import type { AccessScope } from "@calcom/prisma/enums";

interface CreateAccessCodeInput {
  clientId: string;
  userId?: number;
  teamId?: number;
  scopes: AccessScope[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

interface CreateTokensInput {
  clientId: string;
  userId?: number | null;
  teamId?: number | null;
  scopes: AccessScope[];
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
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
export class OAuth2Repository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findByClientId(clientId: string) {
    return this.dbRead.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        logo: true,
        isTrusted: true,
      },
    });
  }

  async findByClientIdWithType(clientId: string) {
    return this.dbRead.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        clientType: true,
      },
    });
  }

  async findByClientIdWithSecret(clientId: string) {
    return this.dbRead.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        clientSecret: true,
        clientType: true,
      },
    });
  }

  async findTeamBySlugAndUserId(teamSlug: string, userId: number) {
    return this.dbRead.prisma.team.findFirst({
      where: {
        slug: teamSlug,
        members: {
          some: {
            userId,
            role: {
              in: ["OWNER", "ADMIN"],
            },
          },
        },
      },
    });
  }

  async createAccessCode(input: CreateAccessCodeInput): Promise<string> {
    const authorizationCode = this.generateAuthorizationCode();

    await this.dbWrite.prisma.accessCode.create({
      data: {
        code: authorizationCode,
        clientId: input.clientId,
        userId: input.userId,
        teamId: input.teamId,
        expiresAt: dayjs().add(10, "minutes").toDate(),
        scopes: input.scopes,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: input.codeChallengeMethod,
      },
    });

    return authorizationCode;
  }

  async findValidAccessCode(code: string, clientId: string) {
    return this.dbRead.prisma.accessCode.findFirst({
      where: {
        code,
        clientId,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        userId: true,
        teamId: true,
        scopes: true,
        codeChallenge: true,
        codeChallengeMethod: true,
      },
    });
  }

  async deleteExpiredAndUsedCodes(code: string, clientId: string) {
    await this.dbWrite.prisma.accessCode.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            code,
            clientId,
          },
        ],
      },
    });
  }

  async createTokens(_input: CreateTokensInput) {
    // TODO: Implement JWT token generation using jsonwebtoken
    // This is a skeleton - actual implementation should:
    // 1. Create access token with 30 minute expiry
    // 2. Create refresh token with 30 day expiry
    // 3. Sign tokens with CALENDSO_ENCRYPTION_KEY
    const accessTokenExpiresIn = 1800; // 30 minutes

    return {
      accessToken: "placeholder_access_token",
      tokenType: "bearer",
      refreshToken: "placeholder_refresh_token",
      expiresIn: accessTokenExpiresIn,
    };
  }

  async verifyRefreshToken(_refreshToken: string): Promise<DecodedRefreshToken | null> {
    // TODO: Implement JWT verification using jsonwebtoken
    // This is a skeleton - actual implementation should:
    // 1. Verify the refresh token signature
    // 2. Check expiration
    // 3. Return decoded payload
    return null;
  }

  private generateAuthorizationCode(): string {
    const randomBytesValue = randomBytes(40);
    return randomBytesValue.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
}
