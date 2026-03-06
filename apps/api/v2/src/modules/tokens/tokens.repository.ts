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

  /** Decode and verify JWT signed with CALENDSO_ENCRYPTION_KEY (web app OAuth tokens). Returns payload or null. */
  private decodeWebOAuthToken(secret: string): { userId: number; clientId: string; exp: number } | null {
    const key = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!key) {
      this.logger.warn(
        "TokensRepository#decodeWebOAuthToken: CALENDSO_ENCRYPTION_KEY not set, cannot validate web-issued JWTs"
      );
      return null;
    }
    try {
      const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
      const decoded = jwt.verify(secret, key) as { userId?: number; clientId?: string; exp?: number };
      if (decoded?.userId != null && decoded?.clientId != null && decoded?.exp != null) {
        return {
          userId: Number(decoded.userId),
          clientId: String(decoded.clientId),
          exp: Number(decoded.exp),
        };
      }
    } catch {
      // not a valid web JWT, wrong key, or expired
    }
    return null;
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
    if (accessToken?.expiresAt) return accessToken.expiresAt;
    const webPayload = this.decodeWebOAuthToken(accessTokenSecret);
    if (webPayload) return new Date(webPayload.exp * 1000);
    return undefined;
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

    if (accessToken?.userId != null) return accessToken.userId;
    const webPayload = this.decodeWebOAuthToken(accessTokenSecret);
    if (webPayload) return webPayload.userId;
    return undefined;
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

    if (token?.client) return token.client;
    const webPayload = this.decodeWebOAuthToken(accessToken);
    if (!webPayload) return undefined;
    const oauthClient = await this.dbRead.prisma.oAuthClient.findFirst({
      where: { clientId: webPayload.clientId },
      select: { clientId: true, redirectUri: true },
    });
    if (!oauthClient) return undefined;
    return {
      id: oauthClient.clientId,
      redirectUris: [oauthClient.redirectUri],
      permissions: 0,
    } as import("@calcom/prisma/client").PlatformOAuthClient;
  }
}
