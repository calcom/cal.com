import { createContainer } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import type { InsightsRoutingService } from "@calcom/lib/server/service/insightsRoutingDI";
import { prismaModule } from "@calcom/prisma/prisma.module";

import { insightsRoutingModule } from "../modules/insights-routing";

export function getInsightsRoutingService() {
  const container = createContainer();
  container.load(DI_TOKENS.READ_ONLY_PRISMA_CLIENT, prismaModule);
  container.load(DI_TOKENS.INSIGHTS_ROUTING_SERVICE_MODULE, insightsRoutingModule);

  return container.get<InsightsRoutingService>(DI_TOKENS.INSIGHTS_ROUTING_SERVICE);
}
