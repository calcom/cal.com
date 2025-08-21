import { createContainer } from "@evyweb/ioctopus";

import { redisModule } from "@calcom/features/redis/di/redisModule";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { prismaModule } from "@calcom/prisma/prisma.module";
import type { NoSlotsNotificationService } from "@calcom/trpc/server/routers/viewer/slots/handleNotificationWhenNoSlots";

import { membershipRepositoryModule } from "../modules/Membership";
import { noSlotsNotificationModule } from "../modules/NoSlotsNotification";
import { teamRepositoryModule } from "../modules/Team";

const container = createContainer();
container.load(DI_TOKENS.REDIS_CLIENT, redisModule);
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.TEAM_REPOSITORY_MODULE, teamRepositoryModule);
container.load(DI_TOKENS.MEMBERSHIP_REPOSITORY_MODULE, membershipRepositoryModule);
container.load(DI_TOKENS.NO_SLOTS_NOTIFICATION_SERVICE_MODULE, noSlotsNotificationModule);

export function getNoSlotsNotificationService() {
  return container.get<NoSlotsNotificationService>(DI_TOKENS.NO_SLOTS_NOTIFICATION_SERVICE);
}
