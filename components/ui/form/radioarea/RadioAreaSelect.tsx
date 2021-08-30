import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDownIcon } from "@heroicons/react/solid";
import React, { useState } from "react";
import { RadioAreaInput, RadioAreaInputGroup } from "@components/ui/form/RadioArea";
import classNames from "@lib/classNames";

export type Option = {
  value?: string | readonly string[] | number;
  label: string;
  description?: string;
};

type RadioAreaSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[];
};

export const RadioAreaSelect = function RadioAreaSelect(props: RadioAreaSelectProps) {
  const options: Option[] = props.options || [];
  const disabled: boolean = !options.length || props.disabled;

  const [option, setOption] = useState<Option | null>(
    props.defaultValue
      ? {
          value: props.defaultValue,
          label: props.options.find((opt) => opt.value === props.defaultValue).label,
        }
      : null
  );

  const changeHandler = (e) => {
    if (props.onChange) {
      props.onChange(e);
    }
    setOption(e);
  };

  return (
    <Collapsible className={classNames("w-full", props.className)}>
      <CollapsibleTrigger
        type="button"
        disabled={disabled}
        className={classNames(
          "mb-1 cursor-pointer focus:ring-primary-500 text-left border border-1 bg-white p-2 shadow-sm block w-full sm:text-sm border-gray-300 rounded-sm",
          disabled && "focus:ring-0 cursor-default bg-gray-200 "
        )}>
        {option?.label || props.placeholder || "Select..."}
        <ChevronDownIcon className="float-right h-5 w-5 text-neutral-500" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <RadioAreaInputGroup className="space-y-2 text-sm" name={props.name} onChange={changeHandler}>
          {options.map((option) => (
            <RadioAreaInput
              {...option}
              key={option.value}
              defaultChecked={props.defaultValue === option.value}>
              <strong className="block mb-1">{option.label}</strong>
              <p>{option.description}</p>
            </RadioAreaInput>
          ))}
        </RadioAreaInputGroup>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default RadioAreaSelect;
