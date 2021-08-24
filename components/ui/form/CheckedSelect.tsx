import Select from "@components/ui/form/Select";
import { XIcon, CheckIcon } from "@heroicons/react/outline";
import React, { useState } from "react";
import Avatar from "@components/Avatar";

export type CheckedSelectProps = {
  defaultValue?: [];
  placeholder?: string;
  name?: string;
  options: [];
};

export const CheckedSelect = function CheckedSelect(props: CheckedSelectProps) {

  const [ selectedOptions, setSelectedOptions ] = useState<[]>(props.defaultValue || []);

  const formatOptionLabel = ({ label, value, avatar, disabled }) => (
    <div className="flex">
      <Avatar
        className="h-6 w-6 rounded-full mr-3"
        displayName={label}
        imageSrc={avatar}
      />
      {label}
      {disabled && <div className="flex-grow">
        <CheckIcon className="text-neutral-500 w-6 h-6 float-right"/>
      </div>}
    </div>
  );

  const options = props.options.map( (option) => ({
    ...option,
    disabled: !!selectedOptions.find(selectedOption => selectedOption.value === option.value),
  }));

  const removeOption = value => setSelectedOptions(selectedOptions.filter(
    option => option.value !== value
  ));

  const changeHandler = e => {
    if (!selectedOptions.find(option => option.value === e.value)) {
      setSelectedOptions(selectedOptions.concat(e));
    } else {
      removeOption(e.value);
    }
  };

  return (
    <>
      <Select
        styles={{
          option: (styles, {isDisabled}) => ({
            ...styles,
            backgroundColor: isDisabled ? '#F5F5F5' : 'inherit',
          })
        }}
        name={props.name}
        placeholder={props.placeholder || "Select..."}
        isSearchable={false}
        formatOptionLabel={formatOptionLabel}
        options={options}
        value={props.placeholder || "Select..."}
        onChange={changeHandler}
      />
      {selectedOptions.map( (option) => (
        <div key={option.value} className="border border-1 p-2 font-medium">
          <Avatar
            className="w-6 h-6 rounded-full inline mr-2"
            imageSrc={option.avatar}
            displayName={option.label}
          />
          {option.label}
          <XIcon onClick={() => removeOption(option.value)} className="cursor-pointer h-5 w-5 mt-0.5 text-neutral-500 float-right" />
        </div>
      ))}
    </>
  );
};

export default CheckedSelect;
