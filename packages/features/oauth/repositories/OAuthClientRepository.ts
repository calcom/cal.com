import type { PrismaClient } from "@calcom/prisma";

interface OAuthClientData {
  redirectUri: string;
  clientSecret: string | null;
  clientType: "CONFIDENTIAL" | "PUBLIC";
}

export class OAuthClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByClientId(clientId: string): Promise<OAuthClientData | null> {
    return await this.prisma.oAuthClient.findFirst({
      where: {
        clientId: clientId,
      },
      select: {
        redirectUri: true,
        clientSecret: true,
        clientType: true,
      },
    });
  }
}