import { createContainer } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import type { IScheduleRepository } from "../../schedules/repositories/IScheduleRepository";
import type { ISelectedSlotRepository } from "@calcom/lib/server/repository/ISelectedSlotRepository";
import { scheduleRepositoryModuleLoader } from "../modules/Schedule";
import { selectedSlotsRepositoryModuleLoader } from "../modules/SelectedSlots";

const repositoryContainer = createContainer();

// Load all repository modules (dependencies are loaded recursively)
scheduleRepositoryModuleLoader.loadModule(repositoryContainer);
selectedSlotsRepositoryModuleLoader.loadModule(repositoryContainer);

export function getScheduleRepository(): IScheduleRepository {
  return repositoryContainer.get<IScheduleRepository>(DI_TOKENS.SCHEDULE_REPOSITORY);
}

export function getSelectedSlotRepository(): ISelectedSlotRepository {
  return repositoryContainer.get<ISelectedSlotRepository>(DI_TOKENS.SELECTED_SLOT_REPOSITORY);
}
