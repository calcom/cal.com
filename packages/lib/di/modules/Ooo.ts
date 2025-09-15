import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";

import { createModule } from "../di";

export const oooRepositoryModule = createModule();
oooRepositoryModule.bind(DI_TOKENS.OOO_REPOSITORY).toClass(PrismaOOORepository, [DI_TOKENS.PRISMA_CLIENT]);
