export declare const getTemplateFieldsSchema: ({ templateType }: {
    templateType: string;
}) => import("zod").ZodObject<{
    eventTypeId: import("zod").ZodNumber;
    enabled: import("zod").ZodDefault<import("zod").ZodBoolean>;
    templateType: import("zod").ZodEnum<["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]>;
    yourPhoneNumber: import("zod").ZodEffects<import("zod").ZodString, string, string>;
    numberToCall: import("zod").ZodEffects<import("zod").ZodString, string, string>;
    calApiKey: import("zod").ZodString;
    schedulerName: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    eventTypeId: number;
    enabled: boolean;
    templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
    schedulerName: string;
    yourPhoneNumber: string;
    numberToCall: string;
    calApiKey: string;
}, {
    eventTypeId: number;
    templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
    schedulerName: string;
    yourPhoneNumber: string;
    numberToCall: string;
    calApiKey: string;
    enabled?: boolean | undefined;
}> | import("zod").ZodObject<{
    eventTypeId: import("zod").ZodNumber;
    enabled: import("zod").ZodDefault<import("zod").ZodBoolean>;
    templateType: import("zod").ZodEnum<["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]>;
    schedulerName: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodString>>;
    yourPhoneNumber: import("zod").ZodEffects<import("zod").ZodString, string, string>;
    numberToCall: import("zod").ZodEffects<import("zod").ZodString, string, string>;
    guestName: import("zod").ZodEffects<import("zod").ZodOptional<import("zod").ZodString>, string | undefined, string | undefined>;
    guestEmail: import("zod").ZodEffects<import("zod").ZodOptional<import("zod").ZodString>, string | undefined, string | undefined>;
    guestCompany: import("zod").ZodEffects<import("zod").ZodOptional<import("zod").ZodString>, string | undefined, string | undefined>;
    beginMessage: import("zod").ZodOptional<import("zod").ZodString>;
    calApiKey: import("zod").ZodString;
    generalPrompt: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    eventTypeId: number;
    enabled: boolean;
    templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
    generalPrompt: string;
    yourPhoneNumber: string;
    numberToCall: string;
    calApiKey: string;
    schedulerName?: string | null | undefined;
    guestName?: string | undefined;
    guestEmail?: string | undefined;
    guestCompany?: string | undefined;
    beginMessage?: string | undefined;
}, {
    eventTypeId: number;
    templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
    generalPrompt: string;
    yourPhoneNumber: string;
    numberToCall: string;
    calApiKey: string;
    enabled?: boolean | undefined;
    schedulerName?: string | null | undefined;
    guestName?: string | undefined;
    guestEmail?: string | undefined;
    guestCompany?: string | undefined;
    beginMessage?: string | undefined;
}>;
//# sourceMappingURL=getTemplateFieldsSchema.d.ts.map