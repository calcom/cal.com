import { ChevronDownIcon } from "@heroicons/react/solid";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import React from "react";
import { FieldValues, Path, UseFormReturn } from "react-hook-form";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { RadioArea, RadioAreaGroup } from "./RadioAreaGroup";

interface OptionProps
  extends Pick<React.OptionHTMLAttributes<HTMLOptionElement>, "value" | "label" | "className"> {
  description?: string;
}

export type FieldPath<TFieldValues extends FieldValues> = Path<TFieldValues>;
interface RadioAreaSelectProps<TFieldValues extends FieldValues>
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "form"> {
  options: OptionProps[]; // allow options to be passed programmatically, like options={}
  onChange?: (value: string) => void;
  form: UseFormReturn<TFieldValues>;
  name: FieldPath<TFieldValues>;
}

export const Select = function RadioAreaSelect<TFieldValues extends FieldValues>(
  props: RadioAreaSelectProps<TFieldValues>
) {
  const { t } = useLocale();
  const {
    options,
    form,
    disabled = !options.length, // if not explicitly disabled and the options length is empty, disable anyway
    placeholder = t("select"),
  } = props;

  const getLabel = (value: string | ReadonlyArray<string> | number | undefined) =>
    options.find((option: OptionProps) => option.value === value)?.label;

  return (
    <Collapsible className={classNames("w-full", props.className)}>
      <CollapsibleTrigger
        type="button"
        disabled={disabled}
        className={classNames(
          "focus:ring-primary-500 mb-1 block w-full cursor-pointer rounded-sm border border border-gray-300 bg-white p-2 text-left shadow-sm sm:text-sm",
          disabled && "cursor-default bg-gray-200 focus:ring-0 "
        )}>
        {getLabel(props.value) ?? placeholder}
        <ChevronDownIcon className="float-right h-5 w-5 text-gray-500" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <RadioAreaGroup className="space-y-2 text-sm" onChange={props.onChange}>
          {options.map((option) => (
            <RadioArea
              {...form.register(props.name)}
              {...option}
              key={Array.isArray(option.value) ? option.value.join(",") : `${option.value}`}>
              <strong className="mb-1 block">{option.label}</strong>
              <p>{option.description}</p>
            </RadioArea>
          ))}
        </RadioAreaGroup>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Select;
