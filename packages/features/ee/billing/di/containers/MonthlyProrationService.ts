import { createContainer } from "@calcom/features/di/di";
import { MonthlyProrationService } from "@calcom/features/ee/billing/service/proration/MonthlyProrationService";

import { monthlyProrationServiceModuleLoader } from "../modules/MonthlyProrationService";
import { DI_TOKENS } from "../tokens";

const container = createContainer();

export function getMonthlyProrationService(): MonthlyProrationService {
  monthlyProrationServiceModuleLoader.loadModule(container);
  return container.get<MonthlyProrationService>(DI_TOKENS.MONTHLY_PRORATION_SERVICE);
}
