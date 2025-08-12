import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import type {
  InsightsRoutingServicePublicOptions,
  InsightsRoutingServiceFilterOptions,
  InsightsRoutingBaseService,
} from "@calcom/lib/server/service/insightsRoutingBase";
import type { InsightsRoutingService } from "@calcom/lib/server/service/insightsRoutingDI";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { insightsRoutingModule } from "../modules/insights-routing";

export function getInsightsRoutingService({
  options,
  filters,
}: {
  options: InsightsRoutingServicePublicOptions;
  filters: InsightsRoutingServiceFilterOptions;
}): InsightsRoutingBaseService {
  const container = createContainer();
  container.load(DI_TOKENS.READ_ONLY_PRISMA_CLIENT, prismaModule);
  container.load(DI_TOKENS.INSIGHTS_ROUTING_SERVICE_MODULE, insightsRoutingModule);

  const diService = container.get<InsightsRoutingService>(DI_TOKENS.INSIGHTS_ROUTING_SERVICE);
  return diService.create({ options, filters });
}
