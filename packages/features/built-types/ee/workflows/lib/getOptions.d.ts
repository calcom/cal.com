import type { TFunction } from "next-i18next";
import type { WorkflowActions } from "@calcom/prisma/enums";
export declare function getWorkflowActionOptions(t: TFunction, isTeamsPlan?: boolean, isOrgsPlan?: boolean): {
    label: string;
    value: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
    needsTeamsUpgrade: boolean;
}[];
export declare function getWorkflowTriggerOptions(t: TFunction): {
    label: string;
    value: "BEFORE_EVENT" | "EVENT_CANCELLED" | "NEW_EVENT" | "AFTER_EVENT" | "RESCHEDULE_EVENT";
}[];
export declare function getWorkflowTemplateOptions(t: TFunction, action: WorkflowActions | undefined): {
    label: string;
    value: any;
}[];
//# sourceMappingURL=getOptions.d.ts.map