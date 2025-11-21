import prisma from "@calcom/prisma";

export class OAuthClientRepository {
  async findByIdWithAppSlug(clientId: string) {
    return await prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        appSlug: true,
      },
    });
  }
}
