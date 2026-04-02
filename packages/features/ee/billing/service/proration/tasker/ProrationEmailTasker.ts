import { Tasker } from "@calcom/lib/tasker/Tasker";
import type { Logger } from "tslog";
import type { ProrationEmailSyncTasker } from "./ProrationEmailSyncTasker";
import type { ProrationEmailTriggerDevTasker } from "./ProrationEmailTriggerDevTasker";
import type {
  CancelReminderPayload,
  IProrationEmailTasker,
  SendInvoiceEmailPayload,
  SendReminderEmailPayload,
} from "./types";

export interface ProrationEmailTaskerDependencies {
  asyncTasker: ProrationEmailTriggerDevTasker;
  syncTasker: ProrationEmailSyncTasker;
  logger: Logger<unknown>;
}

export class ProrationEmailTasker extends Tasker<IProrationEmailTasker> {
  constructor(dependencies: ProrationEmailTaskerDependencies) {
    super(dependencies);
  }

  async sendInvoiceEmail(payload: SendInvoiceEmailPayload): Promise<{ runId: string }> {
    return await this.dispatch("sendInvoiceEmail", payload);
  }

  async sendReminderEmail(payload: SendReminderEmailPayload): Promise<{ runId: string }> {
    return await this.dispatch("sendReminderEmail", payload);
  }

  async cancelReminder(payload: CancelReminderPayload): Promise<{ runId: string }> {
    return await this.dispatch("cancelReminder", payload);
  }
}
