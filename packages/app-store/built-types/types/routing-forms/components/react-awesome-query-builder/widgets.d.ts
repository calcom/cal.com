/// <reference types="react" />
import type { ButtonGroupProps, ButtonProps, ConjsProps, FieldProps, ProviderProps } from "react-awesome-query-builder";
export type CommonProps<TVal extends string | boolean | string[] | {
    value: string;
    optionValue: string;
}> = {
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
    name?: string;
    label?: string;
    value: TVal;
    setValue: (value: TVal) => void;
};
export type SelectLikeComponentProps<TVal extends string | string[] | {
    value: string;
    optionValue: string;
} = string> = {
    options: {
        label: string;
        value: TVal extends (infer P)[] ? P : TVal extends {
            value: string;
        } ? TVal["value"] : TVal;
    }[];
} & CommonProps<TVal>;
export type SelectLikeComponentPropsRAQB<TVal extends string | string[] = string> = {
    listValues: {
        title: string;
        value: TVal extends (infer P)[] ? P : TVal;
    }[];
} & CommonProps<TVal>;
export type TextLikeComponentProps<TVal extends string | string[] | boolean = string> = CommonProps<TVal> & {
    name?: string;
};
export type TextLikeComponentPropsRAQB<TVal extends string | boolean = string> = TextLikeComponentProps<TVal> & {
    customProps?: object;
    type?: "text" | "number" | "email" | "tel" | "url";
    maxLength?: number;
    noLabel?: boolean;
};
declare function NumberWidget({ value, setValue, ...remainingProps }: TextLikeComponentPropsRAQB): JSX.Element;
declare function SelectWidget({ listValues, setValue, value, ...remainingProps }: SelectLikeComponentPropsRAQB): JSX.Element | null;
declare function Button({ config, type, label, onClick, readonly }: ButtonProps): JSX.Element;
declare function ButtonGroup({ children }: ButtonGroupProps): JSX.Element | null;
declare function Conjs({ not, setNot, config, conjunctionOptions, setConjunction, disabled }: ConjsProps): JSX.Element | null;
declare const widgets: {
    TextWidget: (props: TextLikeComponentPropsRAQB) => JSX.Element;
    TextAreaWidget: (props: TextLikeComponentPropsRAQB) => JSX.Element;
    SelectWidget: typeof SelectWidget;
    NumberWidget: typeof NumberWidget;
    MultiSelectWidget: ({ listValues, setValue, value, ...remainingProps }: SelectLikeComponentPropsRAQB<string[]>) => JSX.Element | null;
    FieldSelect: (props: FieldProps) => JSX.Element;
    Button: typeof Button;
    ButtonGroup: typeof ButtonGroup;
    Conjs: typeof Conjs;
    Provider: ({ children }: ProviderProps) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
};
export default widgets;
//# sourceMappingURL=widgets.d.ts.map