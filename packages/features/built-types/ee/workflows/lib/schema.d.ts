import { z } from "zod";
export declare function onlyLettersNumbersSpaces(str: string): boolean;
export declare const formSchema: z.ZodObject<{
    name: z.ZodString;
    activeOn: z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
    }, {
        label: string;
        value: string;
    }>, "many">;
    trigger: z.ZodNativeEnum<{
        readonly BEFORE_EVENT: "BEFORE_EVENT";
        readonly EVENT_CANCELLED: "EVENT_CANCELLED";
        readonly NEW_EVENT: "NEW_EVENT";
        readonly AFTER_EVENT: "AFTER_EVENT";
        readonly RESCHEDULE_EVENT: "RESCHEDULE_EVENT";
    }>;
    time: z.ZodOptional<z.ZodNumber>;
    timeUnit: z.ZodOptional<z.ZodNativeEnum<{
        readonly DAY: "DAY";
        readonly HOUR: "HOUR";
        readonly MINUTE: "MINUTE";
    }>>;
    steps: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        stepNumber: z.ZodNumber;
        action: z.ZodNativeEnum<{
            readonly EMAIL_HOST: "EMAIL_HOST";
            readonly EMAIL_ATTENDEE: "EMAIL_ATTENDEE";
            readonly SMS_ATTENDEE: "SMS_ATTENDEE";
            readonly SMS_NUMBER: "SMS_NUMBER";
            readonly EMAIL_ADDRESS: "EMAIL_ADDRESS";
            readonly WHATSAPP_ATTENDEE: "WHATSAPP_ATTENDEE";
            readonly WHATSAPP_NUMBER: "WHATSAPP_NUMBER";
        }>;
        workflowId: z.ZodNumber;
        reminderBody: z.ZodNullable<z.ZodString>;
        emailSubject: z.ZodNullable<z.ZodString>;
        template: z.ZodNativeEnum<{
            readonly REMINDER: "REMINDER";
            readonly CUSTOM: "CUSTOM";
            readonly CANCELLED: "CANCELLED";
            readonly RESCHEDULED: "RESCHEDULED";
            readonly COMPLETED: "COMPLETED";
            readonly RATING: "RATING";
        }>;
        numberRequired: z.ZodNullable<z.ZodBoolean>;
        includeCalendarEvent: z.ZodNullable<z.ZodBoolean>;
        sendTo: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
        sender: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
        senderName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        template: "CANCELLED" | "REMINDER" | "CUSTOM" | "RESCHEDULED" | "COMPLETED" | "RATING";
        id: number;
        action: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
        stepNumber: number;
        workflowId: number;
        reminderBody: string | null;
        emailSubject: string | null;
        numberRequired: boolean | null;
        includeCalendarEvent: boolean | null;
        sendTo?: string | null | undefined;
        sender?: string | null | undefined;
        senderName?: string | null | undefined;
    }, {
        template: "CANCELLED" | "REMINDER" | "CUSTOM" | "RESCHEDULED" | "COMPLETED" | "RATING";
        id: number;
        action: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
        stepNumber: number;
        workflowId: number;
        reminderBody: string | null;
        emailSubject: string | null;
        numberRequired: boolean | null;
        includeCalendarEvent: boolean | null;
        sendTo?: string | null | undefined;
        sender?: string | null | undefined;
        senderName?: string | null | undefined;
    }>, "many">;
    selectAll: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    name: string;
    steps: {
        template: "CANCELLED" | "REMINDER" | "CUSTOM" | "RESCHEDULED" | "COMPLETED" | "RATING";
        id: number;
        action: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
        stepNumber: number;
        workflowId: number;
        reminderBody: string | null;
        emailSubject: string | null;
        numberRequired: boolean | null;
        includeCalendarEvent: boolean | null;
        sendTo?: string | null | undefined;
        sender?: string | null | undefined;
        senderName?: string | null | undefined;
    }[];
    trigger: "BEFORE_EVENT" | "EVENT_CANCELLED" | "NEW_EVENT" | "AFTER_EVENT" | "RESCHEDULE_EVENT";
    activeOn: {
        label: string;
        value: string;
    }[];
    selectAll: boolean;
    time?: number | undefined;
    timeUnit?: "DAY" | "HOUR" | "MINUTE" | undefined;
}, {
    name: string;
    steps: {
        template: "CANCELLED" | "REMINDER" | "CUSTOM" | "RESCHEDULED" | "COMPLETED" | "RATING";
        id: number;
        action: "EMAIL_HOST" | "EMAIL_ATTENDEE" | "SMS_ATTENDEE" | "SMS_NUMBER" | "EMAIL_ADDRESS" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER";
        stepNumber: number;
        workflowId: number;
        reminderBody: string | null;
        emailSubject: string | null;
        numberRequired: boolean | null;
        includeCalendarEvent: boolean | null;
        sendTo?: string | null | undefined;
        sender?: string | null | undefined;
        senderName?: string | null | undefined;
    }[];
    trigger: "BEFORE_EVENT" | "EVENT_CANCELLED" | "NEW_EVENT" | "AFTER_EVENT" | "RESCHEDULE_EVENT";
    activeOn: {
        label: string;
        value: string;
    }[];
    selectAll: boolean;
    time?: number | undefined;
    timeUnit?: "DAY" | "HOUR" | "MINUTE" | undefined;
}>;
export declare const querySchema: z.ZodObject<{
    workflow: z.ZodUnion<[z.ZodEffects<z.ZodString, number, string>, z.ZodNumber]>;
}, "strip", z.ZodTypeAny, {
    workflow: number;
}, {
    workflow: string | number;
}>;
//# sourceMappingURL=schema.d.ts.map