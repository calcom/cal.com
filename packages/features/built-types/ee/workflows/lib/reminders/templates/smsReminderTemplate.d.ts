import { TimeFormat } from "@calcom/lib/timeFormat";
import { WorkflowActions } from "@calcom/prisma/enums";
declare const smsReminderTemplate: (isEditingMode: boolean, action?: WorkflowActions, timeFormat?: TimeFormat, startTime?: string, eventName?: string, timeZone?: string, attendee?: string, name?: string) => string | null;
export default smsReminderTemplate;
//# sourceMappingURL=smsReminderTemplate.d.ts.map