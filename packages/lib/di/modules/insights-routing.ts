import { createModule } from "@evyweb/ioctopus";

import type { IInsightsRoutingService } from "@calcom/lib/server/service/insightsRoutingDI";
import { InsightsRoutingService } from "@calcom/lib/server/service/insightsRoutingDI";

import { DI_TOKENS } from "../tokens";

export const insightsRoutingModule = createModule();
insightsRoutingModule.bind(DI_TOKENS.INSIGHTS_ROUTING_SERVICE).toClass(InsightsRoutingService, {
  prisma: DI_TOKENS.READ_ONLY_PRISMA_CLIENT,
} satisfies Record<keyof IInsightsRoutingService, symbol>);
