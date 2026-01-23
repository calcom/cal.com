import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { ProrationInvoiceNotificationTriggerTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationInvoiceNotificationTriggerTasker";

import { PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS.TRIGGER_TASKER;
const moduleToken = PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS.TRIGGER_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ProrationInvoiceNotificationTriggerTasker,
  depsMap: {},
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
