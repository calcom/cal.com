import { JwtService } from "@/modules/jwt/jwt.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";

import type { PlatformAuthorizationToken } from "@calcom/prisma/client";

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

  async createOAuthTokens(clientId: string, ownerId: number) {
    const accessExpiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();
    const [accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.accessToken.create({
        data: {
          secret: this.jwtService.signAccessToken({
            clientId,
            ownerId,
            expiresAt: accessExpiry.valueOf(),
            jti: uuidv4(),
          }),
          expiresAt: accessExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: ownerId } },
        },
      }),
      this.dbWrite.prisma.refreshToken.create({
        data: {
          secret: this.jwtService.signRefreshToken({
            clientId,
            ownerId,
            expiresAt: refreshExpiry.valueOf(),
            jti: uuidv4(),
          }),
          expiresAt: refreshExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: ownerId } },
        },
      }),
    ]);

    return {
      accessToken: accessToken.secret,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.secret,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
  }

  async forceRefreshOAuthTokens(clientId: string, ownerId: number) {
    const accessExpiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_deletedAccessToken, _deletedRefreshToken, accessToken, refreshToken] =
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
        this.dbWrite.prisma.accessToken.create({
          data: {
            secret: this.jwtService.signAccessToken({
              clientId,
              ownerId,
              expiresAt: accessExpiry.valueOf(),
              jti: uuidv4(),
            }),
            expiresAt: accessExpiry,
            client: { connect: { id: clientId } },
            owner: { connect: { id: ownerId } },
          },
        }),
        this.dbWrite.prisma.refreshToken.create({
          data: {
            secret: this.jwtService.signRefreshToken({
              clientId,
              ownerId,
              expiresAt: refreshExpiry.valueOf(),
              jti: uuidv4(),
            }),
            expiresAt: refreshExpiry,
            client: { connect: { id: clientId } },
            owner: { connect: { id: ownerId } },
          },
        }),
      ]);

    return {
      accessToken: accessToken.secret,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.secret,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
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

  async refreshOAuthTokens(clientId: string, refreshTokenSecret: string, tokenUserId: number) {
    const accessExpiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, _refresh, accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.accessToken.deleteMany({
        where: { client: { id: clientId }, expiresAt: { lte: new Date() } },
      }),
      this.dbWrite.prisma.refreshToken.delete({ where: { secret: refreshTokenSecret } }),
      this.dbWrite.prisma.accessToken.create({
        data: {
          secret: this.jwtService.signAccessToken({
            clientId,
            ownerId: tokenUserId,
            expiresAt: accessExpiry.valueOf(),
            userId: tokenUserId,
            jti: uuidv4(),
          }),
          expiresAt: accessExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: tokenUserId } },
        },
      }),
      this.dbWrite.prisma.refreshToken.create({
        data: {
          // note(Lauris): I am leaving userId because it was before adding ownerId to standardize payload like in the createOAuthTokens function for
          // backwards compatibility.
          secret: this.jwtService.signRefreshToken({
            clientId,
            ownerId: tokenUserId,
            expiresAt: refreshExpiry.valueOf(),
            userId: tokenUserId,
            jti: uuidv4(),
          }),
          expiresAt: refreshExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: tokenUserId } },
        },
      }),
    ]);
    return { accessToken, refreshToken };
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
