import React from "react";
import BasePhoneInput, { Props } from "react-phone-number-input/react-hook-form";
import "react-phone-number-input/style.css";

import classNames from "@lib/classNames";

type PhoneInputProps = {
  value: string;
  id: string;
  placeholder: string;
  required: boolean;
};

export const PhoneInput = ({ control, name, ...rest }: Props<PhoneInputProps>) => (
  <BasePhoneInput
    {...rest}
    name={name}
    control={control}
    className={classNames(
      "border-1 focus-within:border-brand block w-full rounded-sm border border-gray-300 py-px px-3 shadow-sm ring-black focus-within:ring-1 dark:border-black dark:bg-black dark:text-white"
    )}
    onChange={() => {
      /* DO NOT REMOVE: Callback required by PhoneInput, comment added to satisfy eslint:no-empty-function */
    }}
  />
);

export default PhoneInput;
