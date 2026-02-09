import type { TField } from "@calcom/app-store/routing-forms/zod";
import type { fieldsSchema } from "../schema";
import type { z } from "zod";

type RhfFormField = z.infer<typeof fieldsSchema>[number];

export const toFormBuilderField = (routingField: TField): RhfFormField => {
    return {
        ...routingField,
        name: routingField.identifier || "",
        options: routingField.options?.map((opt) => ({
            label: opt.label,
            value: opt.id || opt.label, // Use label as value if id is null for legacy support
        })),
        // Map Routing type to FormBuilder type if they differ
        // Most types are the same: text, textarea, select, multiselect, email, phone, checkbox, radio
        type: routingField.type as RhfFormField["type"],
    } as RhfFormField;
};

export const fromFormBuilderField = (rhfField: RhfFormField): TField => {
    return {
        ...rhfField,
        identifier: rhfField.name,
        options: rhfField.options?.map((opt) => ({
            label: opt.label,
            id: opt.value,
        })),
        type: rhfField.type,
    } as unknown as TField;
};
