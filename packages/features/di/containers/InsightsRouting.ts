import { DI_TOKENS } from "@calcom/features/di/tokens";
import type {
  InsightsRoutingServicePublicOptions,
  InsightsRoutingServiceFilterOptions,
  InsightsRoutingBaseService,
} from "@calcom/features/insights/services/InsightsRoutingBaseService";
import type { InsightsRoutingService } from "@calcom/features/insights/services/InsightsRoutingDIService";
import { prismaModule } from "@calcom/features/di/modules/Prisma";

import { createContainer } from "../di";
import { insightsRoutingModule } from "../modules/InsightsRouting";

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
