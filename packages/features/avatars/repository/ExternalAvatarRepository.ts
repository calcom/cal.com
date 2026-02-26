import type { PrismaClient } from "@calcom/prisma";

export class ExternalAvatarRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prismaClient.externalAvatar.findUnique({
      where: { email },
      select: { email: true, imageUrl: true },
    });
  }

  async upsert(email: string, imageUrl: string | null) {
    return this.prismaClient.externalAvatar.upsert({
      where: { email },
      create: { email, imageUrl },
      update: { imageUrl },
      select: { email: true, imageUrl: true },
    });
  }
}
