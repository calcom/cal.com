"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState, useMemo } from "react";
import type { Options, Props } from "react-select";
import CreatableSelect from "react-select/creatable";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { getHostsFromOtherGroups } from "@calcom/lib/bookings/hostGroupUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type {
  PriorityDialogCustomClassNames,
  WeightDialogCustomClassNames,
} from "@calcom/features/eventtypes/components/dialogs/HostEditDialogs";
import { PriorityDialog, WeightDialog } from "@calcom/features/eventtypes/components/dialogs/HostEditDialogs";

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
  const [inputValue, setInputValue] = useState("");

  const [currentOption, setCurrentOption] = useState(value[0] ?? null);

  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  const valueFromGroup = groupId ? value.filter((host) => host.groupId === groupId) : value;

  const handleSelectChange = (newValue: readonly CheckedSelectOption[]) => {
    const otherGroupsHosts = getHostsFromOtherGroups(value, groupId);

    const newValueAllGroups = [...otherGroupsHosts, ...newValue.map((host) => ({ ...host, groupId }))];
    props.onChange(newValueAllGroups);
  };

  const handleKeyDown: React.KeyboardEventHandler = (event) => {
    if (!inputValue) return;
    switch (event.key) {
      case "Enter":
      case "Tab":
      case ",": {
        const emails = inputValue.split(/[\s,]+/).filter((e) => e.trim() !== "");
        if (emails.length > 0) {
          const newOptions = emails.map((email) => ({
            label: email,
            value: email,
            avatar: "",
            groupId,
          }));

          const otherGroupsHosts = getHostsFromOtherGroups(value, groupId);
          const newValueAllGroups = [
            ...otherGroupsHosts,
            ...valueFromGroup,
            ...newOptions.filter((opt) => !value.find((v) => v.value === opt.value)),
          ];
          props.onChange(newValueAllGroups);
          setInputValue("");
          event.preventDefault();
        }
        break;
      }
    }
  };

  const { getReactSelectProps } = require("@calcom/ui/components/form/select/selectTheme");
  const { inputStyles } = require("@calcom/ui/components/form/inputs/TextField");
  const cx = require("@calcom/ui/classNames").default;

  const reactSelectProps = useMemo(() => {
    return getReactSelectProps({
      components: props.components || {},
      menuPlacement: props.menuPlacement ?? "auto",
    });
  }, [props.components, props.menuPlacement, getReactSelectProps]);

  return (
    <>
      <CreatableSelect
        {...props}
        {...reactSelectProps}
        inputValue={inputValue}
        onInputChange={(val) => setInputValue(val)}
        onKeyDown={handleKeyDown}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={valueFromGroup}
        onChange={handleSelectChange}
        isMulti
        className={customClassNames?.hostsSelect?.select}
        styles={{
          control: (base) =>
            Object.assign({}, base, {
              minHeight: "32px",
            }),
        }}
        classNames={{
          input: () => cx("text-emphasis", customClassNames?.hostsSelect?.innerClassNames?.input),
          option: (state: any) =>
            cx(
              "bg-default flex cursor-pointer justify-between py-2 px-3 rounded-md text-default items-center",
              state.isFocused && "bg-subtle",
              state.isDisabled && "bg-cal-muted",
              state.isSelected && "bg-emphasis text-default",
              customClassNames?.hostsSelect?.innerClassNames?.option
            ),
          placeholder: (state: any) => cx("text-muted", state.isFocused && "hidden"),
          dropdownIndicator: () => cx("text-default", "w-4 h-4", "flex items-center justify-center "),
          control: (state: any) =>
            cx(
              inputStyles({ size: "md" }),
              state.isMulti ? (state.hasValue ? "p-1 h-fit" : "px-3 h-fit") : "h-8 px-3 py-1",
              state.isDisabled && "bg-subtle !cursor-not-allowed !pointer-events-auto hover:border-subtle",
              "rounded-[10px]",
              "[&:focus-within]:border-emphasis [&:focus-within]:shadow-outline-gray-focused focus-within:ring-0 flex! **:[input]:leading-none text-sm",
              customClassNames?.hostsSelect?.innerClassNames?.control
            ),
          singleValue: () =>
            cx("text-default placeholder:text-muted", customClassNames?.hostsSelect?.innerClassNames?.singleValue),
          valueContainer: () =>
            cx(
              "text-default placeholder:text-muted flex gap-1",
              customClassNames?.hostsSelect?.innerClassNames?.valueContainer
            ),
          multiValue: () =>
            cx(
              "font-medium inline-flex items-center justify-center rounded bg-emphasis text-emphasis leading-none text-xs",
              "py-1 px-1.5 leading-none rounded-lg"
            ),
          menu: () =>
            cx(
              "rounded-lg bg-default text-sm leading-4 text-default mt-1 border border-subtle shadow-dropdown p-1",
              customClassNames?.hostsSelect?.innerClassNames?.menu
            ),
          groupHeading: () => "leading-none text-xs text-muted p-2 font-medium ml-1",
          menuList: () =>
            cx(
              "scroll-bar scrollbar-track-w-20 rounded-md flex flex-col space-y-1",
              customClassNames?.hostsSelect?.innerClassNames?.menuList
            ),
          indicatorsContainer: () => cx("flex items-start! justify-center mt-1 h-full"),
          multiValueRemove: () => "text-default py-auto",
        }}
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
