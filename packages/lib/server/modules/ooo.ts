import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { PrismaOOORepository } from "../repository/ooo";

export const oooRepositoryModule = createModule();
oooRepositoryModule
  .bind(DI_TOKENS.OOO_REPOSITORY)
  .toClass(PrismaOOORepository, { prismaClient: DI_TOKENS.PRISMA_CLIENT }); // Maps 'prismaClient' param to PRISMA_CLIENT token
