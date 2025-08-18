import { createModule } from "@evyweb/ioctopus";

import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";

import { DI_TOKENS } from "../tokens";

export const attributeRepositoryModule = createModule();
attributeRepositoryModule.bind(DI_TOKENS.ATTRIBUTE_REPOSITORY).toClass(PrismaAttributeRepository, {
  prismaClient: DI_TOKENS.PRISMA_CLIENT,
});
