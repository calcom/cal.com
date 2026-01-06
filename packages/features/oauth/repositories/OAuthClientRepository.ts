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
        redirectUris: true,
        clientSecret: true,
        clientType: true,
      },
    });
  }
}
