import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type GetWorkflowActionOptionsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser> & {
            locale: string;
        };
    };
};
export declare const getWorkflowActionOptionsHandler: ({ ctx }: GetWorkflowActionOptionsOptions) => Promise<{
    label: string;
    value: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
    needsTeamsUpgrade: boolean;
}[]>;
export {};
