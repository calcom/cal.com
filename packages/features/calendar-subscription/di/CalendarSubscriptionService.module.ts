import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as cachedFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedFeatureRepository.module";
import { moduleLoader as cachedTeamFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedTeamFeatureRepository.module";
import { moduleLoader as cachedUserFeatureRepositoryModuleLoader } from "@calcom/features/flags/di/CachedUserFeatureRepository.module";
import { CalendarSubscriptionService } from "../lib/CalendarSubscriptionService";
import { moduleLoader as calendarCacheEventServiceModuleLoader } from "./CalendarCacheEventService.module";
import { moduleLoader as calendarSyncServiceModuleLoader } from "./CalendarSyncService.module";
import { moduleLoader as defaultAdapterFactoryModuleLoader } from "./DefaultAdapterFactory.module";
import { moduleLoader as selectedCalendarRepositoryModuleLoader } from "./SelectedCalendarRepository.module";
import { CALENDAR_SUBSCRIPTION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_SUBSCRIPTION_SERVICE;
const moduleToken = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_SUBSCRIPTION_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarSubscriptionService,
  depsMap: {
    adapterFactory: defaultAdapterFactoryModuleLoader,
    selectedCalendarRepository: selectedCalendarRepositoryModuleLoader,
    featureRepository: cachedFeatureRepositoryModuleLoader,
    teamFeatureRepository: cachedTeamFeatureRepositoryModuleLoader,
    userFeatureRepository: cachedUserFeatureRepositoryModuleLoader,
    calendarCacheEventService: calendarCacheEventServiceModuleLoader,
    calendarSyncService: calendarSyncServiceModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CalendarSubscriptionService };
