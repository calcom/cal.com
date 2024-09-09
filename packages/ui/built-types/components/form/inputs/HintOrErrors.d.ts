/// <reference types="react" />
import type { FieldValues } from "react-hook-form";
type hintsOrErrorsProps = {
    hintErrors?: string[];
    fieldName: string;
    t: (key: string) => string;
};
export declare function HintsOrErrors<T extends FieldValues = FieldValues>({ hintErrors, fieldName, t, }: hintsOrErrorsProps): JSX.Element | null;
export {};
//# sourceMappingURL=HintOrErrors.d.ts.map