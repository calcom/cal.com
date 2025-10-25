import { DI_TOKENS } from "@calcom/features/di/tokens";
import type {
  InsightsBookingServicePublicOptions,
  InsightsBookingServiceFilterOptions,
  InsightsBookingBaseService,
} from "@calcom/features/insights/services/InsightsBookingBaseService";
import type { InsightsBookingService } from "@calcom/features/insights/services/InsightsBookingDIService";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { createContainer } from "../di";
import { insightsBookingModule } from "../modules/InsightsBooking";

export function getInsightsBookingService({
  options,
  filters,
}: {
  options: InsightsBookingServicePublicOptions;
  filters?: InsightsBookingServiceFilterOptions;
}): InsightsBookingBaseService {
  const container = createContainer();
  container.load(DI_TOKENS.READ_ONLY_PRISMA_CLIENT, prismaModule);
  container.load(DI_TOKENS.INSIGHTS_BOOKING_SERVICE_MODULE, insightsBookingModule);

  const diService = container.get<InsightsBookingService>(DI_TOKENS.INSIGHTS_BOOKING_SERVICE);
  return diService.create({ options, filters });
}
