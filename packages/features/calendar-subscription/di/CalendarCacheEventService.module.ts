import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { CalendarCacheEventService } from "../lib/cache/CalendarCacheEventService";
import { moduleLoader as calendarCacheEventRepositoryModuleLoader } from "./CalendarCacheEventRepository.module";
import { CALENDAR_SUBSCRIPTION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_CACHE_EVENT_SERVICE;
const moduleToken = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_CACHE_EVENT_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarCacheEventService,
  depsMap: {
    calendarCacheEventRepository: calendarCacheEventRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CalendarCacheEventService };
