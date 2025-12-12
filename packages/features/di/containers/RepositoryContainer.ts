import { createContainer } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { ISelectedCalendarRepository } from "@calcom/lib/server/repository/ISelectedCalendarRepository";
import type { ISelectedSlotRepository } from "@calcom/lib/server/repository/ISelectedSlotRepository";

import type { IBookingRepository } from "../../bookings/repositories/IBookingRepository";
import type { ITeamRepository } from "../../ee/teams/repositories/ITeamRepository";
import type { IEventTypeRepository } from "../../eventtypes/repositories/IEventTypeRepository";
import type { IMembershipRepository } from "../../membership/repositories/IMembershipRepository";
import type { IProfileRepository } from "../../profile/repositories/IProfileRepository";
import type { IScheduleRepository } from "../../schedules/repositories/IScheduleRepository";
import type { IUserRepository } from "../../users/repositories/IUserRepository";
import { moduleLoader as bookingRepositoryModuleLoader } from "../modules/Booking";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "../modules/EventType";
import { moduleLoader as membershipRepositoryModuleLoader } from "../modules/Membership";
import { moduleLoader as profileRepositoryModuleLoader } from "../modules/Profile";
import { scheduleRepositoryModuleLoader } from "../modules/Schedule";
import { selectedCalendarRepositoryModuleLoader } from "../modules/SelectedCalendar";
import { selectedSlotsRepositoryModuleLoader } from "../modules/SelectedSlots";
import { moduleLoader as teamRepositoryModuleLoader } from "../modules/Team";
import { moduleLoader as userRepositoryModuleLoader } from "../modules/User";

const repositoryContainer = createContainer();

// Load all repository modules (dependencies are loaded recursively)
scheduleRepositoryModuleLoader.loadModule(repositoryContainer);
selectedSlotsRepositoryModuleLoader.loadModule(repositoryContainer);
selectedCalendarRepositoryModuleLoader.loadModule(repositoryContainer);
bookingRepositoryModuleLoader.loadModule(repositoryContainer);
userRepositoryModuleLoader.loadModule(repositoryContainer);
teamRepositoryModuleLoader.loadModule(repositoryContainer);
membershipRepositoryModuleLoader.loadModule(repositoryContainer);
eventTypeRepositoryModuleLoader.loadModule(repositoryContainer);
profileRepositoryModuleLoader.loadModule(repositoryContainer);

export function getScheduleRepository(): IScheduleRepository {
  return repositoryContainer.get<IScheduleRepository>(DI_TOKENS.SCHEDULE_REPOSITORY);
}

export function getSelectedSlotRepository(): ISelectedSlotRepository {
  return repositoryContainer.get<ISelectedSlotRepository>(DI_TOKENS.SELECTED_SLOT_REPOSITORY);
}

export function getSelectedCalendarRepository(): ISelectedCalendarRepository {
  return repositoryContainer.get<ISelectedCalendarRepository>(DI_TOKENS.SELECTED_CALENDAR_REPOSITORY);
}

export function getBookingRepository(): IBookingRepository {
  return repositoryContainer.get<IBookingRepository>(DI_TOKENS.BOOKING_REPOSITORY);
}

export function getUserRepository(): IUserRepository {
  return repositoryContainer.get<IUserRepository>(DI_TOKENS.USER_REPOSITORY);
}

export function getTeamRepository(): ITeamRepository {
  return repositoryContainer.get<ITeamRepository>(DI_TOKENS.TEAM_REPOSITORY);
}

export function getMembershipRepository(): IMembershipRepository {
  return repositoryContainer.get<IMembershipRepository>(DI_TOKENS.MEMBERSHIP_REPOSITORY);
}

export function getEventTypeRepository(): IEventTypeRepository {
  return repositoryContainer.get<IEventTypeRepository>(DI_TOKENS.EVENT_TYPE_REPOSITORY);
}

export function getProfileRepository(): IProfileRepository {
  return repositoryContainer.get<IProfileRepository>(DI_TOKENS.PROFILE_REPOSITORY);
}
