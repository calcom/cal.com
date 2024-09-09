/**
 * @fileoverview
 *
 * This file holds the utilities to build the options to render in the select field and it could be loaded on client side as well.
 */
import type { z } from "zod";
import type { zodFieldView } from "../zod";
type Field = z.infer<typeof zodFieldView>;
export declare const getFieldWithOptions: <T extends {
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
}>(field: T) => (T & z.BRAND<"FIELD_WITH_OPTIONS">) | (T & {
    options: {
        label: string;
        id: string | null;
    }[];
}) | (T & {
    options: {
        label: string;
        id: null;
    }[];
});
export declare function areSelectOptionsInLegacyFormat(field: Pick<Field, "options"> & z.BRAND<"FIELD_WITH_OPTIONS">): boolean;
export declare function getUIOptionsForSelect(field: Field): {
    value: string;
    title: string;
}[];
export {};
//# sourceMappingURL=selectOptions.d.ts.map