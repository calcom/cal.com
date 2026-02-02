import type { IInsightsBookingService } from "@calcom/features/insights/services/InsightsBookingDIService";
import { InsightsBookingService } from "@calcom/features/insights/services/InsightsBookingDIService";

import { createModule } from "../di";
import { DI_TOKENS } from "../tokens";

export const insightsBookingModule = createModule();
insightsBookingModule.bind(DI_TOKENS.INSIGHTS_BOOKING_SERVICE).toClass(InsightsBookingService, {
  prisma: DI_TOKENS.READ_ONLY_PRISMA_CLIENT,
} satisfies Record<keyof IInsightsBookingService, symbol>);
