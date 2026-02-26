import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { CalendarCacheEventRepository } from "../lib/cache/CalendarCacheEventRepository";
import { CALENDAR_SUBSCRIPTION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_CACHE_EVENT_REPOSITORY;
const moduleToken = CALENDAR_SUBSCRIPTION_DI_TOKENS.CALENDAR_CACHE_EVENT_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarCacheEventRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CalendarCacheEventRepository };
