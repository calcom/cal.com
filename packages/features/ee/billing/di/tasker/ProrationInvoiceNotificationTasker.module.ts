import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { ProrationInvoiceNotificationTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationInvoiceNotificationTasker";

import { moduleLoader as syncTaskerModule } from "./ProrationInvoiceNotificationSyncTasker.module";
import { moduleLoader as triggerTaskerModule } from "./ProrationInvoiceNotificationTriggerTasker.module";
import { PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS.TASKER;
const moduleToken = PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS.TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ProrationInvoiceNotificationTasker,
  depsMap: {
    asyncTasker: triggerTaskerModule,
    syncTasker: syncTaskerModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
