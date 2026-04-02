import { AssignmentReasonRepository } from "@calcom/features/assignment-reason/repositories/AssignmentReasonRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";

export const assignmentReasonRepositoryModule = createModule();
const token = DI_TOKENS.ASSIGNMENT_REASON_REPOSITORY;
const moduleToken = DI_TOKENS.ASSIGNMENT_REASON_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: assignmentReasonRepositoryModule,
  moduleToken,
  token,
  classs: AssignmentReasonRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
