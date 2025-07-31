import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { SelectedSlotsRepository } from "@calcom/lib/server/repository/selectedSlots";

export const selectedSlotsRepositoryModule = createModule();
selectedSlotsRepositoryModule
  .bind(DI_TOKENS.SELECTED_SLOTS_REPOSITORY)
  .toClass(SelectedSlotsRepository, [DI_TOKENS.PRISMA_CLIENT]);
