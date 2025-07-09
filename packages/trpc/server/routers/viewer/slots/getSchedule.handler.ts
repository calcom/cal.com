import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { oooRepositoryModule } from "@calcom/lib/server/modules/ooo";
import { scheduleRepositoryModule } from "@calcom/lib/server/modules/schedule";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { availableSlotsModule, type AvailableSlotsService } from "../slots/util";
import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const container = createContainer();
  container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
  container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
  container.load(DI_TOKENS.SCHEDULE_REPOSITORY_MODULE, scheduleRepositoryModule);
  container.load(DI_TOKENS.AVAILABLE_SLOTS_SERVICE_MODULE, availableSlotsModule);
  const availableSlotsService = container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
