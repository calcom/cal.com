"use client";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { getHostsFromOtherGroups } from "@calcom/lib/bookings/hostGroupUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { getReactSelectProps, inputStyles } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { Options, Props } from "react-select";
import CreatableSelect from "react-select/creatable";

import type { PriorityDialogCustomClassNames, WeightDialogCustomClassNames } from "./HostEditDialogs";
import { PriorityDialog, WeightDialog } from "./HostEditDialogs";

export type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  priority?: number;
  weight?: number;
  isFixed?: boolean;
  disabled?: boolean;
  defaultScheduleId?: number | null;
  groupId: string | null;
};

export type CheckedTeamSelectCustomClassNames = {
  hostsSelect?: SelectClassNames;
  selectedHostList?: {
    container?: string;
    listItem?: {
      container?: string;
      avatar?: string;
      name?: string;
      changePriorityButton?: string;
      changeWeightButton?: string;
      removeButton?: string;
    };
  };
  priorityDialog?: PriorityDialogCustomClassNames;
  weightDialog?: WeightDialogCustomClassNames;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidInput = (input: string) => {
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 && parts.every((part) => isValidEmail(part));
};

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  isRRWeightsEnabled,
  customClassNames,
  groupId,
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  options?: Options<CheckedSelectOption>;
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
  isRRWeightsEnabled?: boolean;
  customClassNames?: CheckedTeamSelectCustomClassNames;
  groupId: string | null;
}) => {
  const isPlatform = useIsPlatform();
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);

  const [currentOption, setCurrentOption] = useState(value[0] ?? null);

  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  const valueFromGroup = groupId ? value.filter((host) => host.groupId === groupId) : value;

  const handleSelectChange = (newValue: readonly CheckedSelectOption[]) => {
    const otherGroupsHosts = getHostsFromOtherGroups(value, groupId);

    const newValueAllGroups = [...otherGroupsHosts, ...newValue.map((host) => ({ ...host, groupId }))];
    props.onChange(newValueAllGroups);
  };

  const reactSelectProps = getReactSelectProps({
    components: props.components || {},
    menuPlacement: props.menuPlacement || "auto",
  });

  const handleCreateOption = (inputValue: string) => {
    const newEmails = inputValue
      .split(",")
      .map((e) => e.trim())
      .filter((e) => isValidEmail(e));
    const newOptions: CheckedSelectOption[] = newEmails.map((email) => ({
      label: email,
      value: email,
      avatar: "",
      isFixed: false,
      groupId: groupId,
    }));

    // Combine with current values
    handleSelectChange([...valueFromGroup, ...newOptions]);
  };

  return (
    <>
      <CreatableSelect
        {...reactSelectProps}
        {...props}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={valueFromGroup}
        onChange={handleSelectChange}
        onCreateOption={handleCreateOption}
        isMulti
        classNames={{
          input: () => classNames("text-emphasis", customClassNames?.hostsSelect?.input),
          option: (state) =>
            classNames(
              "bg-default flex cursor-pointer justify-between py-2 px-3 rounded-md text-default items-center",
              state.isFocused && "bg-subtle",
              state.isDisabled && "bg-cal-muted",
              state.isSelected && "bg-emphasis text-default",
              customClassNames?.hostsSelect?.option
            ),
          placeholder: (state) => classNames("text-muted", state.isFocused && "hidden"),
          dropdownIndicator: () => classNames("text-default", "w-4 h-4", "flex items-center justify-center "),
          control: (state) =>
            classNames(
              inputStyles({ size: "md" }),
              "px-3 h-fit",
              state.isDisabled && "bg-subtle !cursor-not-allowed !pointer-events-auto hover:border-subtle",
              "rounded-[10px]",
              "[&:focus-within]:border-emphasis [&:focus-within]:shadow-outline-gray-focused focus-within:ring-0 flex! **:[input]:leading-none text-sm",
              customClassNames?.hostsSelect?.control
            ),
          singleValue: () =>
            classNames("text-default placeholder:text-muted", customClassNames?.hostsSelect?.singleValue),
          valueContainer: () =>
            classNames(
              "text-default placeholder:text-muted flex gap-1",
              customClassNames?.hostsSelect?.valueContainer
            ),
          multiValue: () =>
            classNames(
              "font-medium inline-flex items-center justify-center rounded bg-emphasis text-emphasis leading-none text-xs",
              "py-1 px-1.5 leading-none rounded-lg"
            ),
          menu: () =>
            classNames(
              "rounded-lg bg-default text-sm leading-4 text-default mt-1 border border-subtle shadow-dropdown p-1",
              customClassNames?.hostsSelect?.menu
            ),
          groupHeading: () => "leading-none text-xs text-muted p-2 font-medium ml-1",
          menuList: () =>
            classNames(
              "scroll-bar scrollbar-track-w-20 rounded-md flex flex-col space-y-1",
              customClassNames?.hostsSelect?.menuList
            ),
          indicatorsContainer: (state) =>
            classNames(
              "flex items-start! justify-center mt-1 h-full",
              state.selectProps.menuIsOpen
                ? "[&>*:last-child]:rotate-180 [&>*:last-child]:transition-transform [&>*:last-child]:w-4 [&>*:last-child]:h-4"
                : "[&>*:last-child]:transition-transform [&>*:last-child]:w-4 [&>*:last-child]:h-4 text-default"
            ),
          multiValueRemove: () => "text-default py-auto",
        }}
        className={customClassNames?.hostsSelect?.select}
        formatCreateLabel={(inputValue) => `${t("invite")} ${inputValue}`}
        isValidNewOption={(inputValue) => isValidInput(inputValue)}
        getNewOptionData={(inputValue, _optionLabel) => ({
          label: inputValue,
          value: inputValue,
          avatar: "",
          isFixed: false, // Default to false or inherit?
          groupId: groupId,
        })}
      />

      {/* This class name conditional looks a bit odd but it allows a seamless transition when using autoanimate
       - Slides down from the top instead of just teleporting in from nowhere*/}
      <ul
        className={classNames(
          "mb-4 mt-3 rounded-md",
          valueFromGroup.length >= 1 && "border-subtle border",
          customClassNames?.selectedHostList?.container
        )}
        ref={animationRef}>
        {valueFromGroup.map((option, index) => (
          <>
            <li
              key={option.value}
              className={classNames(
                `flex px-3 py-2 ${index === valueFromGroup.length - 1 ? "" : "border-subtle border-b"}`,
                customClassNames?.selectedHostList?.listItem?.container
              )}>
              {!isPlatform && <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />}
              {isPlatform && (
                <Icon
                  name="user"
                  className={classNames(
                    "mt-0.5 h-4 w-4",
                    customClassNames?.selectedHostList?.listItem?.avatar
                  )}
                />
              )}
              <p
                className={classNames(
                  "text-emphasis my-auto ms-3 text-sm",
                  customClassNames?.selectedHostList?.listItem?.name
                )}>
                {option.label}
              </p>
              <div className="ml-auto flex items-center">
                {option && !option.isFixed ? (
                  <>
                    <Tooltip content={t("change_priority")}>
                      <Button
                        color="minimal"
                        onClick={() => {
                          setPriorityDialogOpen(true);
                          setCurrentOption(option);
                        }}
                        className={classNames(
                          "mr-6 h-2 p-0 text-sm hover:bg-transparent",
                          getPriorityTextAndColor(option.priority).color,
                          customClassNames?.selectedHostList?.listItem?.changePriorityButton
                        )}>
                        {t(getPriorityTextAndColor(option.priority).text)}
                      </Button>
                    </Tooltip>
                    {isRRWeightsEnabled ? (
                      <Button
                        color="minimal"
                        className={classNames(
                          "mr-6 h-2 w-4 p-0 text-sm hover:bg-transparent",
                          customClassNames?.selectedHostList?.listItem?.changeWeightButton
                        )}
                        onClick={() => {
                          setWeightDialogOpen(true);
                          setCurrentOption(option);
                        }}>
                        {option.weight ?? 100}%
                      </Button>
                    ) : (
                      <></>
                    )}
                  </>
                ) : (
                  <></>
                )}

                <Icon
                  name="x"
                  onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
                  className={classNames(
                    "my-auto ml-2 h-4 w-4",
                    customClassNames?.selectedHostList?.listItem?.removeButton
                  )}
                />
              </div>
            </li>
          </>
        ))}
      </ul>
      {currentOption && !currentOption.isFixed ? (
        <>
          <PriorityDialog
            isOpenDialog={priorityDialogOpen}
            setIsOpenDialog={setPriorityDialogOpen}
            option={currentOption}
            options={options}
            onChange={props.onChange}
            customClassNames={customClassNames?.priorityDialog}
          />
          <WeightDialog
            isOpenDialog={weightDialogOpen}
            setIsOpenDialog={setWeightDialogOpen}
            option={currentOption}
            options={options}
            onChange={props.onChange}
            customClassNames={customClassNames?.weightDialog}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};

const getPriorityTextAndColor = (priority?: number) => {
  switch (priority) {
    case 0:
      return { text: "lowest", color: "text-gray-300" };
    case 1:
      return { text: "low", color: "text-gray-400" };
    case 2:
      return { text: "medium", color: "text-gray-500" };
    case 3:
      return { text: "high", color: "text-gray-600" };
    case 4:
      return { text: "highest", color: "text-gray-700" };
    default:
      return { text: "medium", color: "text-gray-500" };
  }
};

export default CheckedTeamSelect;
