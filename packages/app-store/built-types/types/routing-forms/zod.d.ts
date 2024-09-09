import { z } from "zod";
export declare const zodNonRouterField: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    identifier: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    /**
     * @deprecated in favour of `options`
     */
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
}>;
export declare const zodRouterField: z.ZodObject<{
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
}>;
export declare const zodField: z.ZodUnion<[z.ZodObject<{
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
    /**
     * @deprecated in favour of `options`
     */
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
}>]>;
export declare const zodFields: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodObject<{
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
    /**
     * @deprecated in favour of `options`
     */
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
export declare const zodNonRouterFieldView: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    identifier: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    /**
     * @deprecated in favour of `options`
     */
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
}>;
export declare const zodRouterFieldView: z.ZodObject<{
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
    routerField: z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        identifier: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        /**
         * @deprecated in favour of `options`
         */
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
    }>;
    router: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
    }, {
        id: string;
        name: string;
        description: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: string;
    label: string;
    id: string;
    routerId: string;
    routerField: {
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
    };
    router: {
        id: string;
        name: string;
        description: string;
    };
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
    routerField: {
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
    };
    router: {
        id: string;
        name: string;
        description: string;
    };
    options?: {
        label: string;
        id: string | null;
    }[] | undefined;
    identifier?: string | undefined;
    placeholder?: string | undefined;
    selectText?: string | undefined;
    required?: boolean | undefined;
    deleted?: boolean | undefined;
}>;
/**
 * Has some additional fields that are not supposed to be saved to DB but are required for the UI
 */
export declare const zodFieldView: z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    identifier: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    /**
     * @deprecated in favour of `options`
     */
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
}>, z.ZodObject<{
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
    routerField: z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        identifier: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        /**
         * @deprecated in favour of `options`
         */
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
    }>;
    router: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
    }, {
        id: string;
        name: string;
        description: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: string;
    label: string;
    id: string;
    routerId: string;
    routerField: {
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
    };
    router: {
        id: string;
        name: string;
        description: string;
    };
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
    routerField: {
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
    };
    router: {
        id: string;
        name: string;
        description: string;
    };
    options?: {
        label: string;
        id: string | null;
    }[] | undefined;
    identifier?: string | undefined;
    placeholder?: string | undefined;
    selectText?: string | undefined;
    required?: boolean | undefined;
    deleted?: boolean | undefined;
}>]>;
export declare const zodFieldsView: z.ZodOptional<z.ZodArray<z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    identifier: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    /**
     * @deprecated in favour of `options`
     */
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
}>, z.ZodObject<{
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
    routerField: z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        identifier: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        /**
         * @deprecated in favour of `options`
         */
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
    }>;
    router: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
    }, {
        id: string;
        name: string;
        description: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: string;
    label: string;
    id: string;
    routerId: string;
    routerField: {
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
    };
    router: {
        id: string;
        name: string;
        description: string;
    };
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
    routerField: {
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
    };
    router: {
        id: string;
        name: string;
        description: string;
    };
    options?: {
        label: string;
        id: string | null;
    }[] | undefined;
    identifier?: string | undefined;
    placeholder?: string | undefined;
    selectText?: string | undefined;
    required?: boolean | undefined;
    deleted?: boolean | undefined;
}>]>, "many">>;
export declare const zodNonRouterRoute: z.ZodObject<{
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
}>;
export declare const zodNonRouterRouteView: z.ZodObject<{
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
}>;
export declare const zodRouterRoute: z.ZodObject<{
    id: z.ZodString;
    isRouter: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    id: string;
    isRouter: true;
}, {
    id: string;
    isRouter: true;
}>;
export declare const zodRoute: z.ZodUnion<[z.ZodObject<{
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
}>]>;
export declare const zodRouterRouteView: z.ZodObject<{
    id: z.ZodString;
    isRouter: z.ZodLiteral<true>;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    routes: z.ZodArray<z.ZodUnion<[z.ZodUnion<[z.ZodObject<{
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
    }>]>, z.ZodNull]>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string | null;
    isRouter: true;
    routes: ({
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
    } | null)[];
}, {
    id: string;
    name: string;
    description: string | null;
    isRouter: true;
    routes: ({
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
    } | null)[];
}>;
export declare const zodRoutes: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodUnion<[z.ZodObject<{
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
export declare const zodRouteView: z.ZodUnion<[z.ZodObject<{
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
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    routes: z.ZodArray<z.ZodUnion<[z.ZodUnion<[z.ZodObject<{
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
    }>]>, z.ZodNull]>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string | null;
    isRouter: true;
    routes: ({
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
    } | null)[];
}, {
    id: string;
    name: string;
    description: string | null;
    isRouter: true;
    routes: ({
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
    } | null)[];
}>]>;
export declare const zodRoutesView: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodUnion<[z.ZodObject<{
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
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    routes: z.ZodArray<z.ZodUnion<[z.ZodUnion<[z.ZodObject<{
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
    }>]>, z.ZodNull]>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description: string | null;
    isRouter: true;
    routes: ({
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
    } | null)[];
}, {
    id: string;
    name: string;
    description: string | null;
    isRouter: true;
    routes: ({
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
    } | null)[];
}>]>, "many">, z.ZodNull]>>;
export declare const appDataSchema: z.ZodAny;
export declare const appKeysSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
//# sourceMappingURL=zod.d.ts.map