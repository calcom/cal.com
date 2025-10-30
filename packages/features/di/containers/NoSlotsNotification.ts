import { DI_TOKENS } from "@calcom/features/di/tokens";
import { redisModule } from "@calcom/features/redis/di/redisModule";
import { membershipRepositoryModule } from "@calcom/features/users/di/MembershipRepository.module";
import { prismaModule } from "@calcom/prisma/prisma.module";
import type { NoSlotsNotificationService } from "@calcom/trpc/server/routers/viewer/slots/handleNotificationWhenNoSlots";

import { createContainer } from "../di";
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
