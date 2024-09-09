import type { z } from "zod";
import type { zodNonRouterField } from "../zod";
type Field = z.infer<typeof zodNonRouterField>;
export declare function ensureStringOrStringArray(value: string | number | (string | number)[]): string | string[];
export declare function getLabelsFromOptionIds({ options, optionIds, }: {
    options: NonNullable<Field["options"]>;
    optionIds: string | string[];
}): string[];
export {};
//# sourceMappingURL=reportingUtils.d.ts.map