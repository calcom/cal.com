import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Props } from "react-select";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, Icon, Select } from "@calcom/ui";

type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  disabled?: boolean;
};

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
}) => {
  const { t } = useLocale();

  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      <Select
        styles={{
          option: (styles, { isDisabled }) => ({
            ...styles,
            backgroundColor: isDisabled ? "#F5F5F5" : "inherit",
          }),
        }}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={false}
        options={options}
        value={value}
        isMulti
        {...props}
      />
      {/* This class name conditional looks a bit odd but it allows a seemless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul className={classNames("mt-3 rounded-md", value.length >= 1 && "border")} ref={animationRef}>
        {value.map((option, index) => (
          <li key={option.value} className={`flex py-2 px-3 ${index === value.length - 1 ? "" : "border-b"}`}>
            <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
            <p className="my-auto ml-3 text-sm text-gray-900">{option.label}</p>
            <Icon.FiX
              onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
              className="my-auto ml-auto"
            />
          </li>
        ))}
      </ul>
    </>
  );
};

export default CheckedTeamSelect;
