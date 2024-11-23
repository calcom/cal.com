import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

export class AttributeToUserRepository {
  static async createMany(data: Prisma.AttributeToUserCreateManyInput[]) {
    return await prisma.attributeToUser.createMany({ data });
  }
}
