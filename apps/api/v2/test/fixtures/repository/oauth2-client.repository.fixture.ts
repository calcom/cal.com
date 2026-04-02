import { AccessScope, OAuthClientStatus, OAuthClientType } from "@calcom/prisma/enums";
import { TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

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
    redirectUri?: string;
    redirectUris: string[];
    hashedSecret?: string;
    clientType?: OAuthClientType;
    status?: OAuthClientStatus;
    logo?: string;
    isTrusted?: boolean;
    userId?: number;
    scopes?: AccessScope[];
  }) {
    return this.prismaWriteClient.oAuthClient.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        redirectUri: data.redirectUri ?? "",
        redirectUris: data.redirectUris,
        clientType: data.clientType || OAuthClientType.CONFIDENTIAL,
        status: data.status || OAuthClientStatus.APPROVED,
        logo: data.logo,
        isTrusted: data.isTrusted || false,
        ...(data.userId && { user: { connect: { id: data.userId } } }),
        ...(data.scopes !== undefined && { scopes: data.scopes }),
        ...(data.hashedSecret && {
          clientSecrets: { create: { hashedSecret: data.hashedSecret, secretHint: "****" } },
        }),
      },
    });
  }

  async updateStatus(clientId: string, status: OAuthClientStatus) {
    return this.prismaWriteClient.oAuthClient.update({
      where: { clientId },
      data: { status },
    });
  }

  async delete(clientId: string) {
    return this.prismaWriteClient.oAuthClient.delete({
      where: { clientId },
    });
  }
}
