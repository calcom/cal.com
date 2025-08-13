import { createModule } from "@evyweb/ioctopus";

import type { INoSlotsNotificationService } from "@calcom/trpc/server/routers/viewer/slots/handleNotificationWhenNoSlots";
import { NoSlotsNotificationService } from "@calcom/trpc/server/routers/viewer/slots/handleNotificationWhenNoSlots";

import { DI_TOKENS } from "../tokens";

export const noSlotsNotificationModule = createModule();
noSlotsNotificationModule
  .bind(DI_TOKENS.NO_SLOTS_NOTIFICATION_SERVICE)
  .toClass(NoSlotsNotificationService, {} satisfies Record<keyof INoSlotsNotificationService, symbol>);
