import type { z } from "zod";
import type { fieldsSchema } from "./schema";
type RhfForm = {
    fields: z.infer<typeof fieldsSchema>;
};
type RhfFormFields = RhfForm["fields"];
type RhfFormField = RhfFormFields[number];
type FieldProps = Pick<RhfFormField, "name" | "type" | "disableOnPrefill" | "variantsConfig" | "optionsInputs">;
export declare const getFieldNameFromErrorMessage: (errorMessage: string) => string;
export declare const useShouldBeDisabledDueToPrefill: (field: FieldProps) => boolean;
export {};
//# sourceMappingURL=useShouldBeDisabledDueToPrefill.d.ts.map