import { createModule } from "@evyweb/ioctopus";

import type { IInsightsBookingService } from "@calcom/lib/server/service/insightsBookingDI";
import { InsightsBookingService } from "@calcom/lib/server/service/insightsBookingDI";

import { DI_TOKENS } from "../tokens";

export const insightsBookingModule = createModule();
insightsBookingModule.bind(DI_TOKENS.INSIGHTS_BOOKING_SERVICE).toClass(InsightsBookingService, {
  prisma: DI_TOKENS.READ_ONLY_PRISMA_CLIENT,
} satisfies Record<keyof IInsightsBookingService, symbol>);
