import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

export class CredentialRepository {
  static async create(data: Prisma.CredentialCreateInput) {
    return await prisma.credential.create({ data });
  }
}
