import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaSelectedCalendarRepository } from "../repositories/prisma-selected-calendar-repository";
import { CALENDAR_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDAR_DI_TOKENS.CALENDAR_V2_SELECTED_CALENDAR_REPOSITORY;
const moduleToken = CALENDAR_DI_TOKENS.CALENDAR_V2_SELECTED_CALENDAR_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaSelectedCalendarRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaSelectedCalendarRepository };
