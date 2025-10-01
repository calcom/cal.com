import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaSelectedSlotRepository } from "@calcom/lib/server/repository/PrismaSelectedSlotRepository";

import { createModule } from "../di";

export const selectedSlotsRepositoryModule = createModule();
selectedSlotsRepositoryModule
  .bind(DI_TOKENS.SELECTED_SLOT_REPOSITORY)
  .toClass(PrismaSelectedSlotRepository, [DI_TOKENS.PRISMA_CLIENT]);
