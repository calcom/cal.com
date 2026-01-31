import type { ITaskerDependencies } from "@calcom/lib/tasker/types";

import type { IProrationEmailTasker } from "./types";

export class ProrationEmailTriggerDevTasker implements IProrationEmailTasker {
  constructor(public readonly dependencies: ITaskerDependencies) {}

  async sendInvoiceEmail(payload: Parameters<IProrationEmailTasker["sendInvoiceEmail"]>[0]) {
    const { sendProrationInvoiceEmail } = await import("./trigger/sendProrationInvoiceEmail");
    const handle = await sendProrationInvoiceEmail.trigger(payload);
    return { runId: handle.id };
  }

  async sendReminderEmail(payload: Parameters<IProrationEmailTasker["sendReminderEmail"]>[0]) {
    const { sendProrationReminderEmail } = await import("./trigger/sendProrationReminderEmail");
    const handle = await sendProrationReminderEmail.trigger(payload);
    return { runId: handle.id };
  }

  async cancelReminder(payload: Parameters<IProrationEmailTasker["cancelReminder"]>[0]) {
    const { cancelProrationReminder } = await import("./trigger/cancelProrationReminder");
    const handle = await cancelProrationReminder.trigger(payload);
    return { runId: handle.id };
  }
}
