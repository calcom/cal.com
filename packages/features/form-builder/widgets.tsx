"use client";

import type { ChangeEvent } from "react";

import { TextArea } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

import type { TextLikeComponentPropsRAQB, SelectLikeComponentPropsRAQB } from "./widget-types";

// Dynamic import for Select to avoid SSR issues
import dynamic from "next/dynamic";

const Select = dynamic(
  async () => (await import("@calcom/ui/components/form")).SelectWithValidation
) as unknown as typeof import("@calcom/ui/components/form").SelectWithValidation;

const TextAreaWidget = (props: TextLikeComponentPropsRAQB) => {
  const { value, setValue, readOnly, placeholder, maxLength, customProps, ...remainingProps } = props;

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
  };

  const textValue = value || "";
  return (
    <TextArea
      value={textValue}
      placeholder={placeholder}
      className="mb-2"
      disabled={readOnly}
      onChange={onChange}
      maxLength={maxLength}
      {...customProps}
      {...remainingProps}
    />
  );
};

const TextWidget = (props: TextLikeComponentPropsRAQB) => {
  const { value, noLabel, setValue, readOnly, placeholder, customProps, type = "text", ...remainingProps } =
    props;
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
  };
  const textValue = value || "";
  return (
    <TextField
      size="sm"
      containerClassName="w-full mb-2"
      type={type}
      value={textValue}
      noLabel={noLabel}
      placeholder={placeholder}
      disabled={readOnly}
      onChange={onChange}
      {...remainingProps}
      {...customProps}
    />
  );
};

function NumberWidget({ value, setValue, ...remainingProps }: TextLikeComponentPropsRAQB) {
  return (
    <TextField
      size="sm"
      type="number"
      labelSrOnly={remainingProps.noLabel}
      containerClassName="w-full"
      className="mb-2"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      {...remainingProps}
    />
  );
}

const MultiSelectWidget = ({
  listValues,
  setValue,
  value,
  ...remainingProps
}: SelectLikeComponentPropsRAQB<string[]>) => {
  if (!listValues) {
    return null;
  }
  const selectItems = listValues.map((item) => {
    return {
      label: item.title,
      value: item.value,
    };
  });

  const optionsFromList = selectItems.filter((item) => value?.includes(item.value));

  if (optionsFromList.length === 0 && value?.length) {
    setValue([]);
  }

  return (
    <Select
      size="sm"
      aria-label="multi-select-dropdown"
      className="mb-2"
      onChange={(items) => {
        setValue(items?.map((item) => item.value));
      }}
      value={optionsFromList}
      isMulti={true}
      isDisabled={remainingProps.readOnly}
      options={selectItems}
      {...remainingProps}
    />
  );
};

function SelectWidget({ listValues, setValue, value, ...remainingProps }: SelectLikeComponentPropsRAQB) {
  if (!listValues) {
    return null;
  }
  const selectItems = listValues.map((item) => {
    return {
      label: item.title,
      value: item.value,
    };
  });

  const defaultValue = selectItems.find((item) => item.value === value);

  return (
    <Select
      size="sm"
      className="mb-2"
      onChange={(item) => {
        if (item) {
          setValue(item.value);
        }
      }}
      defaultValue={defaultValue}
      options={selectItems}
      isDisabled={remainingProps.readOnly}
      {...remainingProps}
    />
  );
}

const widgets = {
  TextWidget,
  TextAreaWidget,
  SelectWidget,
  NumberWidget,
  MultiSelectWidget,
};

export default widgets;
