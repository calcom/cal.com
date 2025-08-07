import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import type {
  InsightsBookingServicePublicOptions,
  InsightsBookingServiceFilterOptions,
  InsightsBookingBaseService,
} from "@calcom/lib/server/service/InsightsBookingBaseService";
import type { InsightsBookingService } from "@calcom/lib/server/service/InsightsBookingDIService";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { insightsBookingModule } from "../modules/insights-booking";

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
