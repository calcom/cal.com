import type { VariantProps } from "class-variance-authority";

import type { inputStyles } from "./TextField";

export type InputFieldProps<Translations extends Record<string, string> = object> = {
  translations?: Translations;
  label?: React.ReactNode;
  LockedIcon?: React.ReactNode;
  hint?: string;
  hintErrors?: string[];
  addOnLeading?: React.ReactNode;
  addOnSuffix?: React.ReactNode;
  inputIsFullWidth?: boolean;
  addOnClassname?: string;
  error?: string;
  labelSrOnly?: boolean;
  containerClassName?: string;
  showAsteriskIndicator?: boolean;
  t?: (key: string) => string;
  className?: string;
  placeholder?: string;
  dataTestid?: string;
  noLabel?: boolean;
  onClickAddon?: (e: React.MouseEvent<HTMLDivElement>) => void;
} & InputProps & {
    labelProps?: React.ComponentProps<typeof Label>;
    labelClassName?: string;
  };

export type InputProps = Omit<JSX.IntrinsicElements["input"], "size" | "ref"> &
  VariantProps<typeof inputStyles> & {
    isFullWidth?: boolean;
  };
