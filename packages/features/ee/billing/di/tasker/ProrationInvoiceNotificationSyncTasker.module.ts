import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { ProrationInvoiceNotificationSyncTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationInvoiceNotificationSyncTasker";

import { PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS.SYNC_TASKER;
const moduleToken = PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS.SYNC_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ProrationInvoiceNotificationSyncTasker,
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
