import type { PrismaClient } from "@calcom/prisma";

export class OAuthClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByClientId(clientId: string) {
    return await this.prisma.oAuthClient.findFirst({
      where: {
        clientId: clientId,
      },
      select: {
        redirectUri: true,
        clientType: true,
        name: true,
        logo: true,
        clientId: true,
        isTrusted: true,
      },
    });
  }

  async findByClientIdWithSecret(clientId: string) {
    return this.prisma.oAuthClient.findUnique({
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
