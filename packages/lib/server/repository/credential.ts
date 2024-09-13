import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

export class CredentialRepository {
  static async create(data: Prisma.CredentialCreateInput) {
    return await prisma.credential.create({ data });
  }
  static async findByAppIdAndUserId({ appId, userId }: { appId: string; userId: number }) {
    return await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
  }
}
