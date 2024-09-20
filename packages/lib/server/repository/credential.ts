import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";

export class CredentialRepository {
  static async create(data: Prisma.CredentialCreateInput) {
    return await prisma.credential.create({ data });
  }

  /**
   * Doesn't retrieve key field as that has credentials
   */
  static async findFirstByIdWithUser({ id }: { id: number }) {
    return await prisma.credential.findFirst({ where: { id }, select: safeCredentialSelect });
  }

  /**
   * Includes 'key' field which is sensitive data.
   */
  static async findFirstByIdWithKeyAndUser({ id }: { id: number }) {
    return await prisma.credential.findFirst({
      where: { id },
      select: { ...safeCredentialSelect, key: true },
    });
  }
}
