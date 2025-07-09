import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { oooRepositoryModule } from "@calcom/lib/server/modules/ooo";
import { scheduleRepositoryModule } from "@calcom/lib/server/modules/schedule";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { availableSlotsModule, type AvailableSlotsService } from "../slots/util";
import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const container = createContainer();
  container.load(Symbol("PrismaModule"), prismaModule);
  container.load(Symbol("OOORepositoryModule"), oooRepositoryModule);
  container.load(Symbol("ScheduleRepositoryModule"), scheduleRepositoryModule);
  container.load(Symbol("AvailableSlotsModule"), availableSlotsModule);
  const availableSlotsService = container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
