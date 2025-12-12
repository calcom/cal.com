import { createContainer } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { ISelectedCalendarRepository } from "@calcom/lib/server/repository/ISelectedCalendarRepository";
import type { ISelectedSlotRepository } from "@calcom/lib/server/repository/ISelectedSlotRepository";

import type { IScheduleRepository } from "../../schedules/repositories/IScheduleRepository";
import { scheduleRepositoryModuleLoader } from "../modules/Schedule";
import { selectedCalendarRepositoryModuleLoader } from "../modules/SelectedCalendar";
import { selectedSlotsRepositoryModuleLoader } from "../modules/SelectedSlots";

const repositoryContainer = createContainer();

// Load all repository modules (dependencies are loaded recursively)
scheduleRepositoryModuleLoader.loadModule(repositoryContainer);
selectedSlotsRepositoryModuleLoader.loadModule(repositoryContainer);
selectedCalendarRepositoryModuleLoader.loadModule(repositoryContainer);

export function getScheduleRepository(): IScheduleRepository {
  return repositoryContainer.get<IScheduleRepository>(DI_TOKENS.SCHEDULE_REPOSITORY);
}

export function getSelectedSlotRepository(): ISelectedSlotRepository {
  return repositoryContainer.get<ISelectedSlotRepository>(DI_TOKENS.SELECTED_SLOT_REPOSITORY);
}

export function getSelectedCalendarRepository(): ISelectedCalendarRepository {
  return repositoryContainer.get<ISelectedCalendarRepository>(DI_TOKENS.SELECTED_CALENDAR_REPOSITORY);
}
