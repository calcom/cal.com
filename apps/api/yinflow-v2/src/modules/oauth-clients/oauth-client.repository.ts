import { Injectable } from "@nestjs/common";
import type { PlatformOAuthClient } from "@prisma/client";

import type { CreateOAuthClientInput } from "@calcom/platform-types";

import { supabase } from "../../config/supabase";
import { JwtService } from "../jwt/jwt.service";

@Injectable()
export class OAuthClientRepository {
  constructor(private jwtService: JwtService) {}

  async createOAuthClient(organizationId: number, data: CreateOAuthClientInput) {
    // return this.dbWrite.prisma.platformOAuthClient.create({
    //   data: {
    //     ...data,
    //     secret: this.jwtService.sign(data),
    //     organizationId,
    //   },
    // });
  }

  async getOAuthClient(clientId: string): Promise<PlatformOAuthClient | null> {
    const { data, error } = (await supabase
      .from("PlatformOAuthClient")
      .select("*")
      .eq("id", clientId)
      .limit(1)
      .single()) as any;

    if (error) return null;

    return data as PlatformOAuthClient;
  }

  // TODO: PrismaReadService
  async getOAuthClientWithAuthTokens(tokenId: string, clientId: string, clientSecret: string) {
    // return this.dbRead.prisma.platformOAuthClient.findUnique({
    //   where: {
    //     id: clientId,
    //     secret: clientSecret,
    //     authorizationTokens: {
    //       some: {
    //         id: tokenId,
    //       },
    //     },
    //   },
    //   include: {
    //     authorizationTokens: {
    //       where: {
    //         id: tokenId,
    //       },
    //       include: {
    //         owner: {
    //           select: {
    //             id: true,
    //           },
    //         },
    //       },
    //     },
    //   },
    // });
  }

  // TODO: PrismaReadService
  async getOAuthClientWithRefreshSecret(clientId: string, clientSecret: string, refreshToken: string) {
    // return this.dbRead.prisma.platformOAuthClient.findFirst({
    //   where: {
    //     id: clientId,
    //     secret: clientSecret,
    //   },
    //   include: {
    //     refreshToken: {
    //       where: {
    //         secret: refreshToken,
    //       },
    //     },
    //   },
    // });
  }

  // TODO: PrismaReadService
  async getOrganizationOAuthClients(organizationId: number): Promise<PlatformOAuthClient[]> {
    // return this.dbRead.prisma.platformOAuthClient.findMany({
    //   where: {
    //     organization: {
    //       id: organizationId,
    //     },
    //   },
    // });

    // tirar essa linha
    return [] as any;
  }

  // TODO: PrismaWriteService
  async updateOAuthClient(
    clientId: string,
    updateData: Partial<CreateOAuthClientInput>
  ): Promise<PlatformOAuthClient> {
    // return this.dbWrite.prisma.platformOAuthClient.update({
    //   where: { id: clientId },
    //   data: updateData,
    // });

    // tirar essa linha
    return null as any;
  }

  // TODO: PrismaReadService
  async deleteOAuthClient(clientId: string): Promise<PlatformOAuthClient> {
    // return this.dbWrite.prisma.platformOAuthClient.delete({
    //   where: { id: clientId },
    // });

    // tirar essa linha
    return null as any;
  }
}
