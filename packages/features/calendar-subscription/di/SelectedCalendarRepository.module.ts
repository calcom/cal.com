import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { SelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository";
import { CALENDAR_SUBSCRIPTION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_SUBSCRIPTION_DI_TOKENS.SELECTED_CALENDAR_REPOSITORY;
const moduleToken = CALENDAR_SUBSCRIPTION_DI_TOKENS.SELECTED_CALENDAR_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: SelectedCalendarRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { SelectedCalendarRepository };
