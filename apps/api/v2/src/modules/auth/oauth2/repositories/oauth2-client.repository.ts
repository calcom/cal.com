import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OAuth2ClientRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findByClientId(clientId: string) {
    return this.dbRead.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        logo: true,
        isTrusted: true,
      },
    });
  }

  async findByClientIdWithType(clientId: string) {
    return this.dbRead.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        clientType: true,
      },
    });
  }

  async findByClientIdWithSecret(clientId: string) {
    return this.dbRead.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        clientSecret: true,
        clientType: true,
      },
    });
  }
}
