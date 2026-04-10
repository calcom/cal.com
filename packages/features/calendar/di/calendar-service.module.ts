import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { CalendarService } from "../services/calendar-service";
import { moduleLoader as calendarCacheServiceModuleLoader } from "./calendar-cache-service.module";
import { moduleLoader as calendarSyncServiceModuleLoader } from "./calendar-sync-service.module";
import { moduleLoader as credentialRepoModuleLoader } from "./prisma-credential-repository.module";
import { moduleLoader as selectedCalendarRepoModuleLoader } from "./prisma-selected-calendar-repository.module";
import { CALENDAR_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_DI_TOKENS.CALENDAR_V2_SERVICE;
const moduleToken = CALENDAR_DI_TOKENS.CALENDAR_V2_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarService,
  depsMap: {
    selectedCalendarRepo: selectedCalendarRepoModuleLoader,
    credentialRepo: credentialRepoModuleLoader,
    cacheService: calendarCacheServiceModuleLoader,
    syncService: calendarSyncServiceModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CalendarService };
