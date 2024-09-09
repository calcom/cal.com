import z from "zod";
export declare const ZFormMutationInputSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    disabled: z.ZodOptional<z.ZodBoolean>;
    fields: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodObject<{
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            id: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string | null;
        }, {
            label: string;
            id: string | null;
        }>, "many">>;
        type: z.ZodString;
        label: z.ZodString;
        id: z.ZodString;
        identifier: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        selectText: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        deleted: z.ZodOptional<z.ZodBoolean>;
        routerId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        label: string;
        id: string;
        routerId: string;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
    }, {
        type: string;
        label: string;
        id: string;
        routerId: string;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        identifier: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        selectText: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        deleted: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            id: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string | null;
        }, {
            label: string;
            id: string | null;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        label: string;
        id: string;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
    }, {
        type: string;
        label: string;
        id: string;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
    }>]>, "many">>;
    routes: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodUnion<[z.ZodObject<{
        id: z.ZodString;
        queryValue: z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            type: z.ZodUnion<[z.ZodLiteral<"group">, z.ZodLiteral<"switch_group">]>;
            children1: z.ZodAny;
            properties: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            type: "group" | "switch_group";
            id?: string | undefined;
            children1?: any;
            properties?: any;
        }, {
            type: "group" | "switch_group";
            id?: string | undefined;
            children1?: any;
            properties?: any;
        }>;
        isFallback: z.ZodOptional<z.ZodBoolean>;
        action: z.ZodObject<{
            type: z.ZodUnion<[z.ZodLiteral<"customPageMessage">, z.ZodLiteral<"externalRedirectUrl">, z.ZodLiteral<"eventTypeRedirectUrl">]>;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
            value: string;
        }, {
            type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
            value: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        queryValue: {
            type: "group" | "switch_group";
            id?: string | undefined;
            children1?: any;
            properties?: any;
        };
        action: {
            type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
            value: string;
        };
        isFallback?: boolean | undefined;
    }, {
        id: string;
        queryValue: {
            type: "group" | "switch_group";
            id?: string | undefined;
            children1?: any;
            properties?: any;
        };
        action: {
            type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
            value: string;
        };
        isFallback?: boolean | undefined;
    }>, z.ZodObject<{
        id: z.ZodString;
        isRouter: z.ZodLiteral<true>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        isRouter: true;
    }, {
        id: string;
        isRouter: true;
    }>]>, "many">, z.ZodNull]>>;
    addFallback: z.ZodOptional<z.ZodBoolean>;
    duplicateFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    teamId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    shouldConnect: z.ZodOptional<z.ZodBoolean>;
    settings: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        emailOwnerOnSubmission: z.ZodBoolean;
        sendUpdatesTo: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        sendToAll: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        emailOwnerOnSubmission: boolean;
        sendUpdatesTo?: number[] | undefined;
        sendToAll?: boolean | undefined;
    }, {
        emailOwnerOnSubmission: boolean;
        sendUpdatesTo?: number[] | undefined;
        sendToAll?: boolean | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    teamId: number | null;
    description?: string | null | undefined;
    disabled?: boolean | undefined;
    fields?: ({
        type: string;
        label: string;
        id: string;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
    } | {
        type: string;
        label: string;
        id: string;
        routerId: string;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
    })[] | undefined;
    routes?: ({
        id: string;
        queryValue: {
            type: "group" | "switch_group";
            id?: string | undefined;
            children1?: any;
            properties?: any;
        };
        action: {
            type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
            value: string;
        };
        isFallback?: boolean | undefined;
    } | {
        id: string;
        isRouter: true;
    })[] | null | undefined;
    addFallback?: boolean | undefined;
    duplicateFrom?: string | null | undefined;
    shouldConnect?: boolean | undefined;
    settings?: {
        emailOwnerOnSubmission: boolean;
        sendUpdatesTo?: number[] | undefined;
        sendToAll?: boolean | undefined;
    } | null | undefined;
}, {
    id: string;
    name: string;
    description?: string | null | undefined;
    disabled?: boolean | undefined;
    fields?: ({
        type: string;
        label: string;
        id: string;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
    } | {
        type: string;
        label: string;
        id: string;
        routerId: string;
        options?: {
            label: string;
            id: string | null;
        }[] | undefined;
        identifier?: string | undefined;
        placeholder?: string | undefined;
        selectText?: string | undefined;
        required?: boolean | undefined;
        deleted?: boolean | undefined;
    })[] | undefined;
    routes?: ({
        id: string;
        queryValue: {
            type: "group" | "switch_group";
            id?: string | undefined;
            children1?: any;
            properties?: any;
        };
        action: {
            type: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
            value: string;
        };
        isFallback?: boolean | undefined;
    } | {
        id: string;
        isRouter: true;
    })[] | null | undefined;
    addFallback?: boolean | undefined;
    duplicateFrom?: string | null | undefined;
    teamId?: number | null | undefined;
    shouldConnect?: boolean | undefined;
    settings?: {
        emailOwnerOnSubmission: boolean;
        sendUpdatesTo?: number[] | undefined;
        sendToAll?: boolean | undefined;
    } | null | undefined;
}>;
export type TFormMutationInputSchema = z.infer<typeof ZFormMutationInputSchema>;
//# sourceMappingURL=formMutation.schema.d.ts.map