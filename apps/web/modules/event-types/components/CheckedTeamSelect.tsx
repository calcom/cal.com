"use client";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { getHostsFromOtherGroups } from "@calcom/lib/bookings/hostGroupUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { getReactSelectProps } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { Options, Props } from "react-select";
import CreatableSelect from "react-select/creatable";

import type { PriorityDialogCustomClassNames, WeightDialogCustomClassNames } from "./HostEditDialogs";
import { PriorityDialog, WeightDialog } from "./HostEditDialogs";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim().toLowerCase());

// Parse comma-separated emails
const parseEmails = (input: string): string[] => {
  return input
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => isValidEmail(e));
};

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
  isEmailInvite?: boolean;
  email?: string;
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
  allowEmailInvites = false,
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  options?: Options<CheckedSelectOption>;
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
  isRRWeightsEnabled?: boolean;
  customClassNames?: CheckedTeamSelectCustomClassNames;
  groupId: string | null;
  allowEmailInvites?: boolean;
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

  // Handle creating new options from typed emails
  const handleCreateOption = (inputValue: string) => {
    const emails = parseEmails(inputValue);
    if (emails.length === 0) return;

    const existingEmails = new Set(value.filter((v) => v.isEmailInvite).map((v) => v.email?.toLowerCase()));
    const existingMemberEmails = new Set(
      options.map((o) => (o as CheckedSelectOption & { email?: string }).email?.toLowerCase()).filter(Boolean)
    );

    const uniqueEmails = Array.from(new Set(emails));

    const newOptions: CheckedSelectOption[] = uniqueEmails
      .filter((email) => !existingEmails.has(email) && !existingMemberEmails.has(email))
      .map((email) => ({
        value: `email-${email}`,
        label: `${email} (${t("invite")})`,
        avatar: "",
        groupId,
        isEmailInvite: true,
        email,
        defaultScheduleId: null,
      }));

    if (newOptions.length > 0) {
      handleSelectChange([...valueFromGroup, ...newOptions]);
    }
  };

  // Validate if input looks like an email
  const isValidNewOption = (inputValue: string): boolean => {
    if (!allowEmailInvites) return false;
    const emails = parseEmails(inputValue);
    return emails.length > 0;
  };

  // Format the create option label
  const formatCreateLabel = (inputValue: string) => {
    const emails = parseEmails(inputValue);
    if (emails.length === 0) return inputValue;
    if (emails.length === 1) return `${t("invite")} ${emails[0]}`;
    return `${t("invite")} ${emails.length} ${t("members").toLowerCase()}`;
  };

  const reactSelectProps = getReactSelectProps<CheckedSelectOption, true>({
    components: {},
  });

  return (
    <>
      <CreatableSelect<CheckedSelectOption, true>
        {...reactSelectProps}
        {...props}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={valueFromGroup}
        onChange={handleSelectChange}
        onCreateOption={allowEmailInvites ? handleCreateOption : undefined}
        isValidNewOption={isValidNewOption}
        formatCreateLabel={formatCreateLabel}
        isMulti
        className={classNames("text-sm", customClassNames?.hostsSelect?.select)}
        classNames={{
          control: () => "rounded-md",
          option: (state) => {
            const data = state.data as CheckedSelectOption;
            return data.isEmailInvite ? "italic text-subtle" : "";
          },
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
