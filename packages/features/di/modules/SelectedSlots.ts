import { PrismaSelectedSlotRepository } from "@calcom/features/bookings/repositories/PrismaSelectedSlotRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { createModule } from "../di";

export const selectedSlotsRepositoryModule = createModule();
selectedSlotsRepositoryModule
  .bind(DI_TOKENS.SELECTED_SLOT_REPOSITORY)
  .toClass(PrismaSelectedSlotRepository, [DI_TOKENS.PRISMA_CLIENT]);
