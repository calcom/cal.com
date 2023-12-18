import { ExchangeAuthorizationCodeInput } from "@/modules/oauth/flow/input/exchange-code.input";
import { CreateOAuthClientInput } from "@/modules/oauth/input/create-oauth-client";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PlatformAuthorizationToken, PlatformOAuthClient } from "@prisma/client";
import { DateTime } from "luxon";

@Injectable()
export class OAuthClientRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private jwtService: JwtService
  ) {}

  async createOAuthClient(organizationId: number, data: CreateOAuthClientInput) {
    return this.dbWrite.prisma.platformOAuthClient.create({
      data: {
        ...data,
        secret: await this.jwtService.signAsync(JSON.stringify(data)),
        organizationId,
      },
    });
  }

  async getOAuthClient(clientId: string): Promise<PlatformOAuthClient | null> {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
    });
  }

  async getOrganizationOAuthClients(organizationId: number): Promise<PlatformOAuthClient[]> {
    return this.dbRead.prisma.platformOAuthClient.findMany({
      where: {
        organization: {
          id: organizationId,
        },
      },
    });
  }

  async updateOAuthClient(
    clientId: string,
    updateData: Partial<CreateOAuthClientInput>
  ): Promise<PlatformOAuthClient> {
    return this.dbWrite.prisma.platformOAuthClient.update({
      where: { id: clientId },
      data: updateData,
    });
  }

  async deleteOAuthClient(clientId: string): Promise<PlatformOAuthClient> {
    return this.dbWrite.prisma.platformOAuthClient.delete({
      where: { id: clientId },
    });
  }

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
    });

    if (!oauthClient) {
      throw new BadRequestException("Invalid Authorization Token.");
    }

    const authorizationToken = await this.dbRead.prisma.platformAuthorizationToken.findUnique({
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
    });

    const accessExpiry = DateTime.now().plus({ days: 1 }).startOf("day").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();

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

    // TODO: propagate access token to redis

    return {
      access_token: accessToken.secret,
      refresh_token: refreshToken.secret,
    };
  }
}
