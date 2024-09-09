/// <reference types="react" />
import type { z } from "zod";
import type { SelectLikeComponentProps, TextLikeComponentProps } from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import type { fieldSchema, FieldType, variantsConfigSchema } from "./schema";
export declare const isValidValueProp: Record<Component["propsType"], (val: unknown) => boolean>;
type Component = {
    propsType: "text";
    factory: <TProps extends TextLikeComponentProps>(props: TProps) => JSX.Element;
} | {
    propsType: "textList";
    factory: <TProps extends TextLikeComponentProps<string[]>>(props: TProps) => JSX.Element;
} | {
    propsType: "select";
    factory: <TProps extends SelectLikeComponentProps>(props: TProps) => JSX.Element;
} | {
    propsType: "boolean";
    factory: <TProps extends TextLikeComponentProps<boolean>>(props: TProps) => JSX.Element;
} | {
    propsType: "multiselect";
    factory: <TProps extends SelectLikeComponentProps<string[]>>(props: TProps) => JSX.Element;
} | {
    propsType: "objectiveWithInput";
    factory: <TProps extends SelectLikeComponentProps<{
        value: string;
        optionValue: string;
    }> & {
        optionsInputs: NonNullable<z.infer<typeof fieldSchema>["optionsInputs"]>;
        value: {
            value: string;
            optionValue: string;
        };
    } & {
        name?: string;
        required?: boolean;
        translatedDefaultLabel?: string;
    }>(props: TProps) => JSX.Element;
} | {
    propsType: "variants";
    factory: <TProps extends Omit<TextLikeComponentProps, "value" | "setValue"> & {
        variant: string | undefined;
        variants: z.infer<typeof variantsConfigSchema>["variants"];
        value: Record<string, string> | string | undefined;
        setValue: (value: string | Record<string, string>) => void;
    }>(props: TProps) => JSX.Element;
};
export declare const Components: Record<FieldType, Component>;
export {};
//# sourceMappingURL=Components.d.ts.map