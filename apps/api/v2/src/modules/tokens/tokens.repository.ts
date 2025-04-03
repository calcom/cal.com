import { JwtService } from "@/modules/jwt/jwt.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { PlatformAuthorizationToken } from "@prisma/client";
import { DateTime } from "luxon";

@Injectable()
export class TokensRepository {
  private readonly logger = new Logger("TokensRepository");

  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly jwtService: JwtService
  ) {}

  async createAuthorizationToken(clientId: string, userId: number): Promise<PlatformAuthorizationToken> {
    return this.dbWrite.prisma.platformAuthorizationToken.create({
      data: {
        client: {
          connect: {
            id: clientId,
          },
        },
        owner: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async invalidateAuthorizationToken(tokenId: string) {
    return this.dbWrite.prisma.platformAuthorizationToken.delete({
      where: {
        id: tokenId,
      },
    });
  }

  async getAuthorizationTokenByClientUserIds(clientId: string, userId: number) {
    return this.dbRead.prisma.platformAuthorizationToken.findFirst({
      where: {
        platformOAuthClientId: clientId,
        userId: userId,
      },
    });
  }

  async getAccessTokenExpiryDate(accessTokenSecret: string) {
    const accessToken = await this.dbRead.prisma.accessToken.findFirst({
      where: {
        secret: accessTokenSecret,
      },
      select: {
        expiresAt: true,
      },
    });
    return accessToken?.expiresAt;
  }

  async getAccessTokenOwnerId(accessTokenSecret: string) {
    const accessToken = await this.dbRead.prisma.accessToken.findFirst({
      where: {
        secret: accessTokenSecret,
      },
      select: {
        userId: true,
      },
    });

    return accessToken?.userId;
  }

  async refreshOAuthTokens(ownerId: number, clientId: string) {
    try {
      await this.deleteOAuthTokens(ownerId, clientId);
    } catch (err) {
      this.logger.error("refreshOAuthTokens - Failed to delete old tokens", err);
    }

    return await this.createOAuthTokens(ownerId, clientId);
  }

  private async deleteOAuthTokens(ownerId: number, clientId: string) {
    await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.accessToken.deleteMany({
        where: { client: { id: clientId }, userId: ownerId },
      }),
      this.dbWrite.prisma.refreshToken.deleteMany({
        where: {
          client: { id: clientId },
          userId: ownerId,
        },
      }),
    ]);
  }

  async createOAuthTokens(ownerId: number, clientId: string) {
    const accessExpiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();

    const [accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.accessToken.create({
        data: {
          secret: this.jwtService.signAccessToken({ clientId, ownerId, expiresAt: accessExpiry.valueOf() }),
          expiresAt: accessExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: ownerId } },
        },
      }),
      this.dbWrite.prisma.refreshToken.create({
        data: {
          secret: this.jwtService.signRefreshToken({ clientId, ownerId, expiresAt: refreshExpiry.valueOf() }),
          expiresAt: refreshExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: ownerId } },
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async getAccessTokenClient(accessToken: string) {
    const token = await this.dbRead.prisma.accessToken.findFirst({
      where: {
        secret: accessToken,
      },
      select: {
        client: true,
      },
    });

    return token?.client;
  }
}
