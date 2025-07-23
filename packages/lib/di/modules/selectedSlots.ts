import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { PrismaSelectedSlotRepository } from "@calcom/lib/server/repository/selectedSlot";

export const selectedSlotsRepositoryModule = createModule();
selectedSlotsRepositoryModule
  .bind(DI_TOKENS.SELECTED_SLOTS_REPOSITORY)
  .toClass(PrismaSelectedSlotRepository, [DI_TOKENS.PRISMA_CLIENT]);
