import { Injectable } from "@nestjs/common";
import { PlatformAuthorizationToken } from "@prisma/client";
import { DateTime } from "luxon";

import { supabase } from "../../config/supabase";
import { JwtService } from "../jwt/jwt.service";

@Injectable()
export class TokensRepository {
  constructor(private readonly jwtService: JwtService) {}
  // TODO: PrismaWriteService
  async createAuthorizationToken(clientId: string, userId: number): Promise<PlatformAuthorizationToken> {
    // return this.dbWrite.prisma.platformAuthorizationToken.create({
    //   data: {
    //     client: {
    //       connect: {
    //         id: clientId,
    //       },
    //     },
    //     owner: {
    //       connect: {
    //         id: userId,
    //       },
    //     },
    //   },
    // });
    // tirar essa linha
    return {} as PlatformAuthorizationToken;
  }
  // TODO: PrismaWriteService
  async invalidateAuthorizationToken(tokenId: string) {
    // return this.dbWrite.prisma.platformAuthorizationToken.delete({
    //   where: {
    //     id: tokenId,
    //   },
    // });
  }
  // TODO: PrismaReadService
  async getAuthorizationTokenByClientUserIds(clientId: string, userId: number) {
    // return this.dbRead.prisma.platformAuthorizationToken.findFirst({
    //   where: {
    //     platformOAuthClientId: clientId,
    //     userId: userId,
    //   },
    // });
  }

  async createOAuthTokens(clientId: string, ownerId: number, deleteOld?: boolean) {
    if (deleteOld) {
      try {
        await supabase.from("AccessToken").delete().eq("clientId", clientId).eq("userId", ownerId);
        await supabase.from("RefreshToken").delete().eq("clientId", clientId).eq("userId", ownerId);
      } catch (err) {
        // discard.
      }
    }
    const accessExpiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
    const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();
    const { data: accessToken } = (await supabase
      .from("AccessToken")
      .insert({
        secret: this.jwtService.signAccessToken({ clientId, ownerId }),
        expiresAt: accessExpiry,
        platformOAuthClientId: clientId,
        userId: ownerId,
      })
      .select("*")
      .single()) as any;

    const { data: refreshToken } = (await supabase
      .from("RefreshToken")
      .insert({
        secret: this.jwtService.signRefreshToken({ clientId, ownerId }),
        expiresAt: refreshExpiry,
        platformOAuthClientId: clientId,
        userId: ownerId,
      })
      .select("*")
      .single()) as any;

    return {
      accessToken: accessToken.secret,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.secret,
    };
  }
  // TODO: PrismaReadService
  async getAccessTokenExpiryDate(accessTokenSecret: string) {
    // const accessToken = await this.dbRead.prisma.accessToken.findFirst({
    //   where: {
    //     secret: accessTokenSecret,
    //   },
    //   select: {
    //     expiresAt: true,
    //   },
    // });
    // return accessToken?.expiresAt;
  }

  async getAccessTokenOwnerId(accessTokenSecret: string) {
    const { data } = (await supabase
      .from("AccessToken")
      .select("user_id")
      .eq("secret", accessTokenSecret)
      .single()) as { data: { userId: number } };

    return data?.userId;
  }
  // TODO: PrismaWriteService
  async refreshOAuthTokens(clientId: string, refreshTokenSecret: string, tokenUserId: number) {
    // const accessExpiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
    // const refreshExpiry = DateTime.now().plus({ year: 1 }).startOf("day").toJSDate();
    // // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const [_, _refresh, accessToken, refreshToken] = await this.dbWrite.prisma.$transaction([
    //   this.dbWrite.prisma.accessToken.deleteMany({
    //     where: { client: { id: clientId }, expiresAt: { lte: new Date() } },
    //   }),
    //   this.dbWrite.prisma.refreshToken.delete({ where: { secret: refreshTokenSecret } }),
    //   this.dbWrite.prisma.accessToken.create({
    //     data: {
    //       secret: this.jwtService.signAccessToken({ clientId, userId: tokenUserId }),
    //       expiresAt: accessExpiry,
    //       client: { connect: { id: clientId } },
    //       owner: { connect: { id: tokenUserId } },
    //     },
    //   }),
    //   this.dbWrite.prisma.refreshToken.create({
    //     data: {
    //       secret: this.jwtService.signRefreshToken({ clientId, userId: tokenUserId }),
    //       expiresAt: refreshExpiry,
    //       client: { connect: { id: clientId } },
    //       owner: { connect: { id: tokenUserId } },
    //     },
    //   }),
    // ]);
    // return { accessToken, refreshToken };
  }
  // TODO: PrismaReadService
  async getAccessTokenClient(accessToken: string) {
    // const token = await this.dbRead.prisma.accessToken.findFirst({
    //   where: {
    //     secret: accessToken,
    //   },
    //   select: {
    //     client: true,
    //   },
    // });
    // return token?.client;
  }
}
