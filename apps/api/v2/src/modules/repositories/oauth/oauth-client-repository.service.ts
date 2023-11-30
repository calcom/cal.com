import type { CreateOAuthClientSchema } from "@/modules/oauth/dtos/create-oauth-client";
import { UpdateOAuthClientSchema } from "@/modules/oauth/dtos/update-oauth-client";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import type { z } from "nestjs-zod/z";

@Injectable()
export class OAuthClientRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async createOAuthClient(userId: number, data: z.infer<typeof CreateOAuthClientSchema>) {
    return this.dbWrite.prisma.platformOAuthClient.create({
      data: {
        ...data,
      },
    });
  }

  async getOAuthClients(userId: number) {
    return this.dbRead.prisma.platformOAuthClient.findMany({
      where: {
        users: {
          some: { id: userId },
        },
      },
    });
  }

  async getOAuthClientById(clientId: string) {
    return this.dbRead.prisma.platformOAuthClient.findUnique({
      where: { id: clientId },
    });
  }

  async updateOAuthClient(clientId: string, updateData: Partial<z.infer<typeof UpdateOAuthClientSchema>>) {
    return this.dbWrite.prisma.platformOAuthClient.update({
      where: { id: clientId },
      data: updateData,
    });
  }

  async deleteOAuthClient(clientId: string) {
    return this.dbWrite.prisma.platformOAuthClient.delete({
      where: { id: clientId },
    });
  }
}
