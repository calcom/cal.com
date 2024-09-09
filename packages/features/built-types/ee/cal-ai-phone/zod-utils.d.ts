import z from "zod";
export declare const templateTypeEnum: z.ZodEnum<["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]>;
export declare const createPhoneCallSchema: z.ZodObject<{
    eventTypeId: z.ZodNumber;
    enabled: z.ZodDefault<z.ZodBoolean>;
    templateType: z.ZodEnum<["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]>;
    yourPhoneNumber: z.ZodEffects<z.ZodString, string, string>;
    numberToCall: z.ZodEffects<z.ZodString, string, string>;
    calApiKey: z.ZodString;
    schedulerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    guestName: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    guestEmail: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    guestCompany: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    beginMessage: z.ZodOptional<z.ZodString>;
    generalPrompt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    eventTypeId: number;
    enabled: boolean;
    templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
    yourPhoneNumber: string;
    numberToCall: string;
    calApiKey: string;
    schedulerName?: string | null | undefined;
    guestName?: string | undefined;
    guestEmail?: string | undefined;
    guestCompany?: string | undefined;
    beginMessage?: string | undefined;
    generalPrompt?: string | undefined;
}, {
    eventTypeId: number;
    templateType: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
    yourPhoneNumber: string;
    numberToCall: string;
    calApiKey: string;
    enabled?: boolean | undefined;
    schedulerName?: string | null | undefined;
    guestName?: string | undefined;
    guestEmail?: string | undefined;
    guestCompany?: string | undefined;
    beginMessage?: string | undefined;
    generalPrompt?: string | undefined;
}>;
export type TCreatePhoneCallSchema = z.infer<typeof createPhoneCallSchema>;
export declare const ZGetPhoneNumberSchema: z.ZodObject<{
    agent_id: z.ZodString;
    inbound_agent_id: z.ZodString;
    outbound_agent_id: z.ZodString;
    error_message: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    agent_id: z.ZodString;
    inbound_agent_id: z.ZodString;
    outbound_agent_id: z.ZodString;
    error_message: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    agent_id: z.ZodString;
    inbound_agent_id: z.ZodString;
    outbound_agent_id: z.ZodString;
    error_message: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type TGetPhoneNumberSchema = z.infer<typeof ZGetPhoneNumberSchema>;
export declare const ZCreatePhoneSchema: z.ZodObject<{
    call_id: z.ZodString;
    agent_id: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    call_id: z.ZodString;
    agent_id: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    call_id: z.ZodString;
    agent_id: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export type TCreatePhoneSchema = z.infer<typeof ZCreatePhoneSchema>;
export declare const fieldSchemaMap: {
    CHECK_IN_APPOINTMENT: z.ZodObject<{
        eventTypeId: z.ZodNumber;
        enabled: z.ZodDefault<z.ZodBoolean>;
        templateType: z.ZodEnum<["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]>;
        yourPhoneNumber: z.ZodEffects<z.ZodString, string, string>;
        numberToCall: z.ZodEffects<z.ZodString, string, string>;
        calApiKey: z.ZodString;
        schedulerName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
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
    }>;
    CUSTOM_TEMPLATE: z.ZodObject<{
        eventTypeId: z.ZodNumber;
        enabled: z.ZodDefault<z.ZodBoolean>;
        templateType: z.ZodEnum<["CHECK_IN_APPOINTMENT", "CUSTOM_TEMPLATE"]>;
        schedulerName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        yourPhoneNumber: z.ZodEffects<z.ZodString, string, string>;
        numberToCall: z.ZodEffects<z.ZodString, string, string>;
        guestName: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        guestEmail: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        guestCompany: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        beginMessage: z.ZodOptional<z.ZodString>;
        calApiKey: z.ZodString;
        generalPrompt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
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
};
export type TemplateType = z.infer<typeof templateTypeEnum>;
declare const fieldTypeEnum: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean"]>;
export declare const fieldNameEnum: z.ZodEnum<["schedulerName", "generalPrompt", "guestName", "guestEmail", "guestCompany", "beginMessage"]>;
export type FieldType = z.infer<typeof fieldTypeEnum>;
declare const FieldsSchema: z.ZodArray<z.ZodObject<{
    type: z.ZodEnum<["name", "text", "textarea", "number", "email", "phone", "address", "multiemail", "select", "multiselect", "checkbox", "radio", "radioInput", "boolean"]>;
    name: z.ZodEnum<["schedulerName", "generalPrompt", "guestName", "guestEmail", "guestCompany", "beginMessage"]>;
    required: z.ZodBoolean;
    defaultLabel: z.ZodString;
    placeholder: z.ZodString;
    variableName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: "schedulerName" | "generalPrompt" | "guestName" | "guestEmail" | "guestCompany" | "beginMessage";
    defaultLabel: string;
    placeholder: string;
    required: boolean;
    variableName?: string | undefined;
}, {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: "schedulerName" | "generalPrompt" | "guestName" | "guestEmail" | "guestCompany" | "beginMessage";
    defaultLabel: string;
    placeholder: string;
    required: boolean;
    variableName?: string | undefined;
}>, "many">;
export type Fields = z.infer<typeof FieldsSchema>;
export declare const ZCreateRetellLLMSchema: z.ZodObject<{
    llm_id: z.ZodString;
    llm_websocket_url: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    llm_id: z.ZodString;
    llm_websocket_url: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    llm_id: z.ZodString;
    llm_websocket_url: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
export type TCreateRetellLLMSchema = z.infer<typeof ZCreateRetellLLMSchema>;
export declare const ZGetRetellLLMSchema: z.ZodObject<{
    general_prompt: z.ZodString;
    begin_message: z.ZodNullable<z.ZodString>;
    llm_id: z.ZodString;
    llm_websocket_url: z.ZodString;
    general_tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    states: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    general_prompt: z.ZodString;
    begin_message: z.ZodNullable<z.ZodString>;
    llm_id: z.ZodString;
    llm_websocket_url: z.ZodString;
    general_tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    states: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    general_prompt: z.ZodString;
    begin_message: z.ZodNullable<z.ZodString>;
    llm_id: z.ZodString;
    llm_websocket_url: z.ZodString;
    general_tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodString;
        type: z.ZodString;
        cal_api_key: z.ZodOptional<z.ZodString>;
        event_type_id: z.ZodOptional<z.ZodNumber>;
        timezone: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    states: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodString;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            name: z.ZodString;
            type: z.ZodString;
            cal_api_key: z.ZodOptional<z.ZodString>;
            event_type_id: z.ZodOptional<z.ZodNumber>;
            timezone: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">;
    }, z.ZodTypeAny, "passthrough">>, "many">>>;
}, z.ZodTypeAny, "passthrough">>;
export type TGetRetellLLMSchema = z.infer<typeof ZGetRetellLLMSchema>;
export {};
//# sourceMappingURL=zod-utils.d.ts.map