import { createContainer } from "@calcom/features/di/di";
import type { MonthlyProrationTasker } from "@calcom/features/ee/billing/service/proration/tasker/MonthlyProrationTasker";
import { moduleLoader as monthlyProrationTaskerModule } from "./MonthlyProrationTasker.module";
import { MONTHLY_PRORATION_TASKER_DI_TOKENS } from "./tokens";

const container = createContainer();

export function getMonthlyProrationTasker(): MonthlyProrationTasker {
  monthlyProrationTaskerModule.loadModule(container);
  return container.get<MonthlyProrationTasker>(MONTHLY_PRORATION_TASKER_DI_TOKENS.MONTHLY_PRORATION_TASKER);
}
