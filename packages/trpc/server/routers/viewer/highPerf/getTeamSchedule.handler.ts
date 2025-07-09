import { createContainer } from "@evyweb/ioctopus";
import type { IncomingMessage } from "http";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { oooRepositoryModule } from "@calcom/lib/server/modules/ooo";
import { scheduleRepositoryModule } from "@calcom/lib/server/modules/schedule";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { availableSlotsModule, type AvailableSlotsService } from "../slots/util";
import type { TGetTeamScheduleInputSchema } from "./getTeamSchedule.schema";

export type GetTeamScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetTeamScheduleInputSchema;
};

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

export const getTeamScheduleHandler = async ({ ctx, input }: GetTeamScheduleOptions) => {
  const container = createContainer();
  container.load(Symbol("PrismaModule"), prismaModule);
  container.load(Symbol("OOORepositoryModule"), oooRepositoryModule);
  container.load(Symbol("ScheduleRepositoryModule"), scheduleRepositoryModule);
  container.load(Symbol("AvailableSlotsModule"), availableSlotsModule);
  const availableSlotsService = container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
