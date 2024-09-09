import type { ScheduleTextReminderArgs } from "./smsReminderManager";
export declare const scheduleWhatsappReminder: (args: ScheduleTextReminderArgs) => Promise<void>;
export declare const deleteScheduledWhatsappReminder: (reminderId: number, referenceId: string | null) => Promise<void>;
//# sourceMappingURL=whatsappReminderManager.d.ts.map