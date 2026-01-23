import { Tasker } from "@calcom/lib/tasker/Tasker";

import type { ProrationInvoiceNotificationSyncTasker } from "./ProrationInvoiceNotificationSyncTasker";
import type { ProrationInvoiceNotificationTriggerTasker } from "./ProrationInvoiceNotificationTriggerTasker";
import type { IProrationInvoiceNotificationTasker, InvoiceNotificationPayload } from "./types";

export interface ProrationInvoiceNotificationTaskerDependencies {
  asyncTasker: ProrationInvoiceNotificationTriggerTasker;
  syncTasker: ProrationInvoiceNotificationSyncTasker;
}

export class ProrationInvoiceNotificationTasker
  extends Tasker<IProrationInvoiceNotificationTasker>
  implements IProrationInvoiceNotificationTasker
{
  constructor(dependencies: ProrationInvoiceNotificationTaskerDependencies) {
    super(dependencies);
  }

  async sendInvoiceCreatedNotification(payload: InvoiceNotificationPayload): Promise<{ runId: string }> {
    return await this.dispatch("sendInvoiceCreatedNotification", payload);
  }

  async sendInvoiceReminderNotification(
    payload: InvoiceNotificationPayload,
    options?: { delay?: string }
  ): Promise<{ runId: string }> {
    return await this.dispatch("sendInvoiceReminderNotification", payload, options);
  }
}
