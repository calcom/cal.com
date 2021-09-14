import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDownIcon } from "@heroicons/react/solid";
import React from "react";
import { RadioArea, RadioAreaGroup } from "@components/ui/form/radio-area/RadioAreaGroup";
import classNames from "@lib/classNames";

type OptionProps = React.OptionHTMLAttributes<HTMLOptionElement> & {
  description?: string;
};

type RadioAreaSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: OptionProps[]; // allow options to be passed programmatically, like options={}
};

export const Select = function RadioAreaSelect(props: RadioAreaSelectProps) {
  const {
    options,
    disabled = !options.length, // if not explicitly disabled and the options length is empty, disable anyway
    placeholder = "Select...",
  } = props;

  const getLabel = (value: string | ReadonlyArray<string> | number) =>
    options.find((option: OptionProps) => option.value === value)?.label;

  return (
    <Collapsible className={classNames("w-full", props.className)}>
      <CollapsibleTrigger
        type="button"
        disabled={disabled}
        className={classNames(
          "mb-1 cursor-pointer focus:ring-primary-500 text-left border border-1 bg-white p-2 shadow-sm block w-full sm:text-sm border-gray-300 rounded-sm",
          disabled && "focus:ring-0 cursor-default bg-gray-200 "
        )}>
        {getLabel(props.value) ?? placeholder}
        <ChevronDownIcon className="float-right h-5 w-5 text-neutral-500" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <RadioAreaGroup className="space-y-2 text-sm" name={props.name} onChange={props.onChange}>
          {options.map((option) => (
            <RadioArea {...option} key={option.value} defaultChecked={props.value === option.value}>
              <strong className="block mb-1">{option.label}</strong>
              <p>{option.description}</p>
            </RadioArea>
          ))}
        </RadioAreaGroup>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Select;
