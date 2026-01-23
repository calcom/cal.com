import { createContainer } from "@calcom/features/di/di";

import type { ProrationInvoiceNotificationTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationInvoiceNotificationTasker";

import { moduleLoader as prorationInvoiceNotificationTaskerModule } from "./ProrationInvoiceNotificationTasker.module";
import { PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS } from "./tokens";

const container = createContainer();

export function getProrationInvoiceNotificationTasker(): ProrationInvoiceNotificationTasker {
  prorationInvoiceNotificationTaskerModule.loadModule(container);
  return container.get<ProrationInvoiceNotificationTasker>(
    PRORATION_INVOICE_NOTIFICATION_TASKER_DI_TOKENS.TASKER
  );
}
