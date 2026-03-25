import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaHolidayRepository } from "@calcom/features/holidays/repositories/PrismaHolidayRepository";

import { type Container, createModule } from "../di";

export const holidayRepositoryModule = createModule();
const token = DI_TOKENS.HOLIDAY_REPOSITORY;
const moduleToken = DI_TOKENS.HOLIDAY_REPOSITORY_MODULE;
holidayRepositoryModule.bind(token).toClass(PrismaHolidayRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(moduleToken, holidayRepositoryModule);
  },
};
