import type { Field, FormResponse } from "../types/types";
export declare function getFieldResponseForJsonLogic({ field, value, }: {
    field: Pick<Field, "options" | "type">;
    value: FormResponse[string]["value"] | undefined;
}): string | number | string[];
//# sourceMappingURL=transformResponse.d.ts.map