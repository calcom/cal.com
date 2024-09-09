import type { MailData } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";
export declare function getBatchId(): Promise<string>;
export declare function sendSendgridMail(mailData: Partial<MailData>, addData: {
    sender?: string | null;
    includeCalendarEvent?: boolean;
}): Promise<unknown>;
export declare function cancelScheduledEmail(referenceId: string | null): Promise<void> | Promise<[sgMail.ClientResponse, any]>;
export declare function deleteScheduledSend(referenceId: string | null): Promise<void> | Promise<[sgMail.ClientResponse, any]>;
//# sourceMappingURL=sendgridProvider.d.ts.map