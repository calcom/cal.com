export declare const sendSMS: (phoneNumber: string, body: string, sender: string, userId?: number | null, teamId?: number | null, whatsapp?: boolean) => Promise<import("twilio/lib/rest/api/v2010/account/message").MessageInstance | undefined>;
export declare const scheduleSMS: (phoneNumber: string, body: string, scheduledDate: Date, sender: string, userId?: number | null, teamId?: number | null, whatsapp?: boolean) => Promise<import("twilio/lib/rest/api/v2010/account/message").MessageInstance | {
    sid: string;
} | undefined>;
export declare const cancelSMS: (referenceId: string) => Promise<void>;
export declare const sendVerificationCode: (phoneNumber: string) => Promise<void>;
export declare const verifyNumber: (phoneNumber: string, code: string) => Promise<string | undefined>;
//# sourceMappingURL=twilioProvider.d.ts.map