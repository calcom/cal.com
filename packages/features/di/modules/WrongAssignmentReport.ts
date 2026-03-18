import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { type Container, createModule } from "../di";

export const wrongAssignmentReportRepositoryModule = createModule();
const token = DI_TOKENS.WRONG_ASSIGNMENT_REPORT_REPOSITORY;
const moduleToken = DI_TOKENS.WRONG_ASSIGNMENT_REPORT_REPOSITORY_MODULE;
wrongAssignmentReportRepositoryModule.bind(token).toClass(WrongAssignmentReportRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(moduleToken, wrongAssignmentReportRepositoryModule);
  },
};
