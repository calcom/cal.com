import { ExchangeAuthorizationCodeInput } from "@/modules/oauth/flow/input/exchange-code.input";
import { OAuthFlowService } from "@/modules/oauth/flow/oauth-flow.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PlatformAuthorizationToken } from "@prisma/client";
import { DateTime } from "luxon";

@Injectable()
export class TokensRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly jwtService: JwtService,
    private readonly oauthService: OAuthFlowService
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

  async exchangeAuthorizationToken(
    tokenId: string,
    input: ExchangeAuthorizationCodeInput
  ): Promise<{ access_token: string; refresh_token: string }> {
    const oauthClient = await this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        id: input.client_id,
        secret: input.client_secret,
        authorizationTokens: {
          some: {
            id: tokenId,
          },
        },
      },
      include: {
        authorizationTokens: {
          where: {
            id: tokenId,
          },
          include: {
            owner: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!oauthClient) {
      throw new BadRequestException("Invalid Authorization Token.");
    }

    const authorizationToken = oauthClient.authorizationTokens[0];

    const accessExpiry = DateTime.now().plus({ days: 1 }).startOf("day").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.platformAuthorizationToken.delete({ where: { id: tokenId } }),
      this.dbWrite.prisma.accessToken.create({
        data: {
          secret: this.jwtService.sign(JSON.stringify({ type: "access_token", clientId: oauthClient.id })),
          expiresAt: accessExpiry,
          client: { connect: { id: input.client_id } },
          owner: { connect: { id: authorizationToken?.owner.id } },
        },
      }),
      this.dbWrite.prisma.refreshToken.create({
        data: {
          secret: this.jwtService.sign(JSON.stringify({ type: "refresh_token", clientId: oauthClient.id })),
          expiresAt: refreshExpiry,
          client: { connect: { id: input.client_id } },
          owner: { connect: { id: authorizationToken?.owner.id } },
        },
      }),
    ]);

    void this.oauthService.propagateAccessToken(accessToken); // voided as we don't need to await

    return {
      access_token: accessToken.secret,
      refresh_token: refreshToken.secret,
    };
  }

  async refreshToken(clientId: string, clientSecret: string, tokenSecret: string) {
    const oauthClient = await this.dbRead.prisma.platformOAuthClient.findFirst({
      where: {
        id: clientId,
        secret: clientSecret,
      },
      include: {
        refreshToken: {
          where: {
            secret: tokenSecret,
          },
        },
      },
    });

    if (!oauthClient) {
      throw new BadRequestException("Invalid OAuthClient credentials.");
    }

    const _refreshToken = oauthClient.refreshToken[0];

    if (!_refreshToken) {
      throw new BadRequestException("Invalid refresh token");
    }

    const accessExpiry = DateTime.now().plus({ days: 1 }).startOf("day").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, _refresh, accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
      this.dbWrite.prisma.accessToken.deleteMany({
        where: { client: { id: oauthClient.id }, expiresAt: { lte: new Date() } },
      }),
      this.dbWrite.prisma.refreshToken.delete({ where: { secret: tokenSecret } }),
      this.dbWrite.prisma.accessToken.create({
        data: {
          secret: this.jwtService.sign(JSON.stringify({ type: "access_token", clientId: oauthClient.id })),
          expiresAt: accessExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: _refreshToken.userId } },
        },
      }),
      this.dbWrite.prisma.refreshToken.create({
        data: {
          secret: this.jwtService.sign(JSON.stringify({ type: "refresh_token", clientId: oauthClient.id })),
          expiresAt: refreshExpiry,
          client: { connect: { id: clientId } },
          owner: { connect: { id: _refreshToken.userId } },
        },
      }),
    ]);

    void this.oauthService.propagateAccessToken(accessToken);

    return {
      access_token: accessToken.secret,
      refresh_token: refreshToken.secret,
    };
  }
}
