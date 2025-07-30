import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";
import type { AvailableSlotsService } from "@calcom/trpc/server/routers/viewer/slots/util";

import { availableSlotsModule } from "../modules/available-slots";
import { bookingRepositoryModule } from "../modules/booking";
import { eventTypeRepositoryModule } from "../modules/eventType";
import { oooRepositoryModule } from "../modules/ooo";
import { routingFormResponseRepositoryModule } from "../modules/routingFormResponse";
import { scheduleRepositoryModule } from "../modules/schedule";
import { selectedSlotsRepositoryModule } from "../modules/selectedSlots";
import { teamRepositoryModule } from "../modules/team";
import { userRepositoryModule } from "../modules/user";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.OOO_REPOSITORY_MODULE, oooRepositoryModule);
container.load(DI_TOKENS.SCHEDULE_REPOSITORY_MODULE, scheduleRepositoryModule);
container.load(DI_TOKENS.SELECTED_SLOT_REPOSITORY_MODULE, selectedSlotsRepositoryModule);
container.load(DI_TOKENS.TEAM_REPOSITORY_MODULE, teamRepositoryModule);
container.load(DI_TOKENS.USER_REPOSITORY_MODULE, userRepositoryModule);
container.load(DI_TOKENS.BOOKING_REPOSITORY_MODULE, bookingRepositoryModule);
container.load(DI_TOKENS.EVENT_TYPE_REPOSITORY_MODULE, eventTypeRepositoryModule);
container.load(DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY_MODULE, routingFormResponseRepositoryModule);
container.load(DI_TOKENS.AVAILABLE_SLOTS_SERVICE_MODULE, availableSlotsModule);

export function getAvailableSlotsService() {
  return container.get<AvailableSlotsService>(DI_TOKENS.AVAILABLE_SLOTS_SERVICE);
}
