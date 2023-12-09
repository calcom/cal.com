import type { ReactNode } from "react";

import type { Input } from "./TextField";

export type InputFieldProps = {
  label?: ReactNode;
  LockedIcon?: React.ReactNode;
  hint?: ReactNode;
  hintErrors?: string[];
  addOnLeading?: ReactNode;
  addOnSuffix?: ReactNode;
  inputIsFullWidth?: boolean;
  addOnFilled?: boolean;
  addOnClassname?: string;
  error?: string;
  labelSrOnly?: boolean;
  containerClassName?: string;
  showAsteriskIndicator?: boolean;
  t?: (key: string) => string;
  onClickAddon?: () => void;
} & React.ComponentProps<typeof Input> & {
    labelProps?: React.ComponentProps<typeof Label>;
    labelClassName?: string;
  };

export type InputProps = JSX.IntrinsicElements["input"] & { isFullWidth?: boolean };
