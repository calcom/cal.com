/**
 * Widget type definitions for form-builder field component props.
 */

export type CommonProps<
  TVal extends
    | string
    | boolean
    | string[]
    | {
        value: string;
        optionValue: string;
      }
> = {
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  name?: string;
  label?: string;
  value: TVal;
  setValue: (value: TVal) => void;
};

export type SelectLikeComponentProps<
  TVal extends
    | string
    | string[]
    | {
        value: string;
        optionValue: string;
      } = string
> = {
  options: {
    label: string;
    value: TVal extends (infer P)[]
      ? P
      : TVal extends {
            value: string;
          }
        ? TVal["value"]
        : TVal;
  }[];
} & CommonProps<TVal>;

export type SelectLikeComponentPropsRAQB<TVal extends string | string[] = string> = {
  listValues: { title: string; value: TVal extends (infer P)[] ? P : TVal }[];
} & CommonProps<TVal>;

export type TextLikeComponentProps<TVal extends string | string[] | boolean = string> = CommonProps<TVal> & {
  name?: string;
};

export type TextLikeComponentPropsRAQB<TVal extends string | boolean = string> =
  TextLikeComponentProps<TVal> & {
    customProps?: object;
    type?: "text" | "number" | "email" | "tel" | "url";
    maxLength?: number;
    noLabel?: boolean;
  };
