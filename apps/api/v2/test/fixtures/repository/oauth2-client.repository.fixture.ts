import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import { OAuthClientType } from "@calcom/prisma/enums";

export class OAuth2ClientRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: {
    clientId: string;
    name: string;
    redirectUri: string;
    clientSecret?: string;
    clientType?: OAuthClientType;
    logo?: string;
    isTrusted?: boolean;
  }) {
    return this.prismaWriteClient.oAuthClient.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        redirectUri: data.redirectUri,
        clientSecret: data.clientSecret,
        clientType: data.clientType || OAuthClientType.CONFIDENTIAL,
        logo: data.logo,
        isTrusted: data.isTrusted || false,
      },
    });
  }

  async delete(clientId: string) {
    return this.prismaWriteClient.oAuthClient.delete({
      where: { clientId },
    });
  }
}
