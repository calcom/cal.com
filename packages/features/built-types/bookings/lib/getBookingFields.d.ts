import type { EventTypeCustomInput, EventType } from "@prisma/client";
import type { z } from "zod";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import { customInputSchema, eventTypeBookingFields, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
type Fields = z.infer<typeof eventTypeBookingFields>;
export declare const getSmsReminderNumberField: () => {
    readonly name: "smsReminderNumber";
    readonly type: "phone";
    readonly defaultLabel: "number_text_notifications";
    readonly defaultPlaceholder: "enter_phone_number";
    readonly editable: "system";
};
export declare const getSmsReminderNumberSource: ({ workflowId, isSmsReminderNumberRequired, }: {
    workflowId: Workflow["id"];
    isSmsReminderNumberRequired: boolean;
}) => {
    id: string;
    type: string;
    label: string;
    fieldRequired: boolean;
    editUrl: string;
};
/**
 * This fn is the key to ensure on the fly mapping of customInputs to bookingFields and ensuring that all the systems fields are present and correctly ordered in bookingFields
 */
export declare const getBookingFieldsWithSystemFields: ({ bookingFields, disableGuests, disableBookingTitle, customInputs, metadata, workflows, }: {
    bookingFields: Fields | EventType["bookingFields"];
    disableGuests: boolean;
    disableBookingTitle?: boolean | undefined;
    customInputs: EventTypeCustomInput[] | z.infer<typeof customInputSchema>[];
    metadata: EventType["metadata"] | z.infer<typeof EventTypeMetaDataSchema>;
    workflows: {
        workflow: Workflow;
    }[];
}) => {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: string;
    label?: string | undefined;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    maxLength?: number | undefined;
    defaultLabel?: string | undefined;
    defaultPlaceholder?: string | undefined;
    labelAsSafeHtml?: string | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    getOptionsAt?: string | undefined;
    optionsInputs?: Record<string, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }> | undefined;
    minLength?: number | undefined;
    variant?: string | undefined;
    variantsConfig?: {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    } | undefined;
    views?: {
        label: string;
        id: string;
        description?: string | undefined;
    }[] | undefined;
    hideWhenJustOneOption?: boolean | undefined;
    hidden?: boolean | undefined;
    editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
    sources?: {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }[] | undefined;
    disableOnPrefill?: boolean | undefined;
}[] & z.BRAND<"HAS_SYSTEM_FIELDS">;
export declare const ensureBookingInputsHaveSystemFields: ({ bookingFields, disableGuests, disableBookingTitle, additionalNotesRequired, customInputs, workflows, }: {
    bookingFields: {
        type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
        name: string;
        label?: string | undefined;
        options?: {
            label: string;
            value: string;
        }[] | undefined;
        maxLength?: number | undefined;
        defaultLabel?: string | undefined;
        defaultPlaceholder?: string | undefined;
        labelAsSafeHtml?: string | undefined;
        placeholder?: string | undefined;
        required?: boolean | undefined;
        getOptionsAt?: string | undefined;
        optionsInputs?: Record<string, {
            type: "text" | "address" | "phone";
            required?: boolean | undefined;
            placeholder?: string | undefined;
        }> | undefined;
        minLength?: number | undefined;
        variant?: string | undefined;
        variantsConfig?: {
            variants: Record<string, {
                fields: {
                    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                    name: string;
                    label?: string | undefined;
                    maxLength?: number | undefined;
                    labelAsSafeHtml?: string | undefined;
                    placeholder?: string | undefined;
                    required?: boolean | undefined;
                    minLength?: number | undefined;
                }[];
            }>;
        } | undefined;
        views?: {
            label: string;
            id: string;
            description?: string | undefined;
        }[] | undefined;
        hideWhenJustOneOption?: boolean | undefined;
        hidden?: boolean | undefined;
        editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
        sources?: {
            label: string;
            type: string;
            id: string;
            editUrl?: string | undefined;
            fieldRequired?: boolean | undefined;
        }[] | undefined;
        disableOnPrefill?: boolean | undefined;
    }[];
    disableGuests: boolean;
    disableBookingTitle?: boolean | undefined;
    additionalNotesRequired: boolean;
    customInputs: z.infer<typeof customInputSchema>[];
    workflows: {
        workflow: Workflow;
    }[];
}) => {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: string;
    label?: string | undefined;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    maxLength?: number | undefined;
    defaultLabel?: string | undefined;
    defaultPlaceholder?: string | undefined;
    labelAsSafeHtml?: string | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    getOptionsAt?: string | undefined;
    optionsInputs?: Record<string, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }> | undefined;
    minLength?: number | undefined;
    variant?: string | undefined;
    variantsConfig?: {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    } | undefined;
    views?: {
        label: string;
        id: string;
        description?: string | undefined;
    }[] | undefined;
    hideWhenJustOneOption?: boolean | undefined;
    hidden?: boolean | undefined;
    editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
    sources?: {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }[] | undefined;
    disableOnPrefill?: boolean | undefined;
}[] & z.BRAND<"HAS_SYSTEM_FIELDS">;
export {};
//# sourceMappingURL=getBookingFields.d.ts.map