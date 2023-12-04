import type { CreateOAuthClientSchema } from "@/modules/oauth/dtos/create-oauth-client";
import { UpdateOAuthClientSchema } from "@/modules/oauth/dtos/update-oauth-client";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import type { z } from "nestjs-zod/z";

@Injectable()
export class OAuthClientRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createOAuthClient(userId: number, data: z.infer<typeof CreateOAuthClientSchema>) {
    // note(Lauris): TODO after creating platformOAuthClient table
    // return this.dbWrite.prisma.platformOAuthClient.create({
    //   data: {
    //     ...data,
    //     users: {
    //       connect: { id: userId },
    //     },
    //   },
    // });
    return {
      id: "sample-id",
      client_secret: "sample-secret",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOAuthClient(clientId: string) {
    // note(Lauris): TODO after creating platformOAuthClient table
    // return this.dbRead.prisma.platformOAuthClient.findUnique({
    //   where: { id: clientId },
    // });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUserOAuthClients(userId: number) {
    // note(Lauris): TODO after creating platformOAuthClient table
    // return this.dbRead.prisma.platformOAuthClient.findMany({
    //   where: {
    //     users: {
    //       some: { id: userId },
    //     },
    //   },
    // });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateOAuthClient(clientId: string, updateData: Partial<z.infer<typeof UpdateOAuthClientSchema>>) {
    // note(Lauris): TODO after creating platformOAuthClient table
    // return this.dbWrite.prisma.platformOAuthClient.update({
    //   where: { id: clientId },
    //   data: updateData,
    // });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteOAuthClient(clientId: string) {
    // note(Lauris): TODO after creating platformOAuthClient table
    // return this.dbWrite.prisma.platformOAuthClient.delete({
    //   where: { id: clientId },
    // });
  }
}
