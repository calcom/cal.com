import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { CalendarSyncService } from "../lib/sync/CalendarSyncService";
import { CALENDAR_SUBSCRIPTION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_SYNC_SERVICE;
const moduleToken = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_SYNC_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarSyncService,
  depsMap: {
    bookingRepository: bookingRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CalendarSyncService };
