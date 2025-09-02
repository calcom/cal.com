import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";

export const attributeRepositoryModule = createModule();
attributeRepositoryModule
  .bind(DI_TOKENS.ATTRIBUTE_REPOSITORY)
  .toClass(PrismaAttributeRepository, [DI_TOKENS.PRISMA_CLIENT]);
