import type { TCreateRetellLLMSchema, TGetRetellLLMSchema, TCreatePhoneCallSchema, TemplateType, TGetPhoneNumberSchema, TCreatePhoneSchema } from "./zod-utils";
type DynamicVariables = Pick<TCreatePhoneCallSchema, "guestName" | "guestEmail" | "guestCompany" | "schedulerName">;
type initProps = {
    templateType: TemplateType;
    yourPhoneNumber: string;
    eventTypeId: number;
    calApiKey: string;
    loggedInUserTimeZone: string;
    beginMessage?: string;
    dynamicVariables: DynamicVariables;
    generalPrompt: string;
};
export declare const validatePhoneNumber: (phoneNumber: string) => Promise<import("zod").objectOutputType<{
    agent_id: import("zod").ZodString;
    inbound_agent_id: import("zod").ZodString;
    outbound_agent_id: import("zod").ZodString;
    error_message: import("zod").ZodOptional<import("zod").ZodString>;
}, import("zod").ZodTypeAny, "passthrough">>;
export declare class RetellAIService {
    private props;
    constructor(props: initProps);
    createRetellLLMAndUpdateWebsocketUrl(): Promise<TCreateRetellLLMSchema>;
    getRetellLLM(llmId: string): Promise<TGetRetellLLMSchema>;
    updatedRetellLLMAndUpdateWebsocketUrl(llmId: string): Promise<TGetRetellLLMSchema>;
    getPhoneNumberDetails(): Promise<TGetPhoneNumberSchema>;
    createRetellPhoneCall(numberToCall: string): Promise<TCreatePhoneSchema>;
}
export {};
//# sourceMappingURL=retellAIService.d.ts.map