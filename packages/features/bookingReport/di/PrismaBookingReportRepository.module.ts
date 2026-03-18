import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaBookingReportRepository } from "../repositories/PrismaBookingReportRepository";

const thisModule = createModule();
const token = DI_TOKENS.BOOKING_REPORT_REPOSITORY;
const moduleToken = DI_TOKENS.BOOKING_REPORT_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaBookingReportRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
