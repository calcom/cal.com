import type { INoSlotsNotificationService } from "@calcom/features/slots/handleNotificationWhenNoSlots";
import { NoSlotsNotificationService } from "@calcom/features/slots/handleNotificationWhenNoSlots";
import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const noSlotsNotificationModule = createModule();
noSlotsNotificationModule.bind(DI_TOKENS.NO_SLOTS_NOTIFICATION_SERVICE).toClass(NoSlotsNotificationService, {
  teamRepo: DI_TOKENS.TEAM_REPOSITORY,
  membershipRepo: DI_TOKENS.MEMBERSHIP_REPOSITORY,
  redisClient: DI_TOKENS.REDIS_CLIENT,
} satisfies Record<keyof INoSlotsNotificationService, symbol>);
