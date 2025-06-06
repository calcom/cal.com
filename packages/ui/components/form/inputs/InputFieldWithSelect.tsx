import React from "react";

import { UnstyledSelect } from "../../address/Select";
import { InputField } from "./TextField";
import type { InputFieldProps } from "./types";

export const InputFieldWithSelect = function EmailField({
  ref: forwardedRef,
  ...props
}: InputFieldProps & { selectProps: typeof UnstyledSelect } & {
  ref?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <InputField
      ref={forwardedRef}
      {...props}
      inputIsFullWidth={false}
      addOnClassname="!px-0"
      addOnSuffix={<UnstyledSelect {...props.selectProps} />}
    />
  );
};
