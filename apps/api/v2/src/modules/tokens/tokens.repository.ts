import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PlatformAuthorizationToken } from "@prisma/client";
import { randomBytes } from "crypto";
import { DateTime } from "luxon";

@Injectable()
export class TokensRepository {
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

  async createOAuthTokens(clientId: string, ownerId: number) {
    const accessExpiry = DateTime.now().plus({ days: 1 }).startOf("day").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();
    const [accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.accessToken.create({
        data: {
          secret: this.jwtService.sign(
            JSON.stringify({
              type: "access_token",
              clientId,
              ownerId,
              secret: randomBytes(32).toString("hex"),
            })
          ),
          expiresAt: accessExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: ownerId } },
        },
      }),
      this.dbWrite.prisma.refreshToken.create({
        data: {
          secret: this.jwtService.sign(
            JSON.stringify({
              type: "refresh_token",
              clientId,
              ownerId,
              secret: randomBytes(32).toString("hex"),
            })
          ),
          expiresAt: refreshExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: ownerId } },
        },
      }),
    ]);

    return {
      accessToken: accessToken.secret,
      refreshToken: refreshToken.secret,
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
    const accessExpiry = DateTime.now().plus({ days: 1 }).startOf("day").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, _refresh, accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.accessToken.deleteMany({
        where: { client: { id: clientId }, expiresAt: { lte: new Date() } },
      }),
      this.dbWrite.prisma.refreshToken.delete({ where: { secret: refreshTokenSecret } }),
      this.dbWrite.prisma.accessToken.create({
        data: {
          secret: this.jwtService.sign(
            JSON.stringify({
              type: "access_token",
              clientId: clientId,
              secret: randomBytes(32).toString("hex"),
            })
          ),
          expiresAt: accessExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: tokenUserId } },
        },
      }),
      this.dbWrite.prisma.refreshToken.create({
        data: {
          secret: this.jwtService.sign(
            JSON.stringify({
              type: "refresh_token",
              clientId: clientId,
              secret: randomBytes(32).toString("hex"),
            })
          ),
          expiresAt: refreshExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: tokenUserId } },
        },
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
