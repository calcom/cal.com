import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";
import type { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";

import { availableSlotsModule } from "../modules/available-slots";
import { oooRepositoryModule } from "../modules/ooo";
import { scheduleRepositoryModule } from "../modules/schedule";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
container.load(DI_TOKENS.SCHEDULE_REPOSITORY_MODULE, scheduleRepositoryModule);
container.load(DI_TOKENS.AVAILABLE_SLOTS_SERVICE_MODULE, availableSlotsModule);

export function getAvailableSlotsService() {
  return container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
}
