import type { WorkflowTriggerEvents } from "@prisma/client";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { whatsappReminderTemplate } from "../lib/reminders/templates/whatsapp";
export declare function shouldScheduleEmailReminder(action: WorkflowActions): boolean;
export declare function shouldScheduleSMSReminder(action: WorkflowActions): boolean;
export declare function isSMSAction(action: WorkflowActions): boolean;
export declare function isWhatsappAction(action: WorkflowActions): boolean;
export declare function isSMSOrWhatsappAction(action: WorkflowActions): boolean;
export declare function isAttendeeAction(action: WorkflowActions): boolean;
export declare function isEmailToAttendeeAction(action: WorkflowActions): boolean;
export declare function isTextMessageToSpecificNumber(action?: WorkflowActions): boolean;
export declare function getWhatsappTemplateForTrigger(trigger: WorkflowTriggerEvents): WorkflowTemplates;
export declare function getWhatsappTemplateFunction(template?: WorkflowTemplates): typeof whatsappReminderTemplate;
export declare function getWhatsappTemplateForAction(action: WorkflowActions, template: WorkflowTemplates, timeFormat: TimeFormat): string | null;
//# sourceMappingURL=actionHelperFunctions.d.ts.map