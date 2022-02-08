import { ChevronDownIcon } from "@heroicons/react/solid";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import React from "react";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";

import { RadioArea, RadioAreaGroup } from "@components/ui/form/radio-area/RadioAreaGroup";

type OptionProps = React.OptionHTMLAttributes<HTMLOptionElement> & {
  description?: string;
};

type RadioAreaSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: OptionProps[]; // allow options to be passed programmatically, like options={}
};

export const Select = function RadioAreaSelect(props: RadioAreaSelectProps) {
  const { t } = useLocale();
  const {
    options,
    disabled = !options.length, // if not explicitly disabled and the options length is empty, disable anyway
    placeholder = t("select"),
  } = props;

  const getLabel = (value: string | ReadonlyArray<string> | number) =>
    options.find((option: OptionProps) => option.value === value)?.label;

  return (
    <Collapsible className={classNames("w-full", props.className)}>
      <CollapsibleTrigger
        type="button"
        disabled={disabled}
        className={classNames(
          "border-1 mb-1 block w-full cursor-pointer rounded-sm border border-gray-300 bg-white p-2 text-left shadow-sm focus:ring-primary-500 sm:text-sm",
          disabled && "cursor-default bg-gray-200 focus:ring-0 "
        )}>
        {getLabel(props.value) ?? placeholder}
        <ChevronDownIcon className="float-right h-5 w-5 text-neutral-500" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <RadioAreaGroup className="space-y-2 text-sm" name={props.name} onChange={props.onChange}>
          {options.map((option) => (
            <RadioArea {...option} key={option.value} defaultChecked={props.value === option.value}>
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
