import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { CalendarCacheService } from "../services/calendar-cache-service";
import { moduleLoader as calendarCacheEventRepoModuleLoader } from "./prisma-calendar-cache-event-repository.module";
import { CALENDAR_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_DI_TOKENS.CALENDAR_V2_CACHE_SERVICE;
const moduleToken = CALENDAR_DI_TOKENS.CALENDAR_V2_CACHE_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarCacheService,
  depsMap: {
    cacheRepo: calendarCacheEventRepoModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CalendarCacheService };
