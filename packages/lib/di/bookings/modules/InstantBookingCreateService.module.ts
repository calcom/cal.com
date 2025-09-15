import { InstantBookingCreateService } from "@calcom/features/instant-meeting/handleInstantMeeting";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { createModule } from "../../di";

export const instantBookingCreateServiceModule = createModule();

instantBookingCreateServiceModule
  .bind(DI_TOKENS.INSTANT_BOOKING_CREATE_SERVICE)
  .toClass(InstantBookingCreateService);
export type { InstantBookingCreateService };
