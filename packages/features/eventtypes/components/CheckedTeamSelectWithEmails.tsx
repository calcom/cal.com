"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
import type { Options, Props } from "react-select";
import { components as selectComponents } from "react-select";
import type { GroupBase, MenuListProps } from "react-select";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { getHostsFromOtherGroups } from "@calcom/lib/bookings/hostGroupUtils";
import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { PriorityDialogCustomClassNames, WeightDialogCustomClassNames } from "./HostEditDialogs";
import { PriorityDialog, WeightDialog } from "./HostEditDialogs";

export type CheckedSelectOptionWithEmail = {
  avatar: string;
  label: string;
  value: string;
  priority?: number;
  weight?: number;
  isFixed?: boolean;
  disabled?: boolean;
  defaultScheduleId?: number | null;
  groupId: string | null;
  email?: string;
  isEmailInvite?: boolean;
};

export type CheckedTeamSelectWithEmailsCustomClassNames = {
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

const CustomMenuList = ({
  children,
  ...props
}: MenuListProps<CheckedSelectOptionWithEmail, true, GroupBase<CheckedSelectOptionWithEmail>>) => {
  const { t } = useLocale();
  const selectInputValue = props.selectProps.inputValue;

  return (
    <selectComponents.MenuList {...props}>
      {children}
      {selectInputValue && (
        <div className="bg-subtle border-subtle animate-fadeIn border-t px-3 py-2">
          <div className="text-muted flex items-center gap-2 text-xs">
            <Icon name="corner-down-left" className="h-3 w-3" />
            <span>{t("press_enter_to_add_email", { email: selectInputValue })}</span>
          </div>
        </div>
      )}
    </selectComponents.MenuList>
  );
};

export const CheckedTeamSelectWithEmails = ({
  options = [],
  value = [],
  isRRWeightsEnabled,
  customClassNames,
  groupId,
  ...props
}: Omit<Props<CheckedSelectOptionWithEmail, true>, "value" | "onChange"> & {
  options?: Options<CheckedSelectOptionWithEmail>;
  value?: readonly CheckedSelectOptionWithEmail[];
  onChange: (value: readonly CheckedSelectOptionWithEmail[]) => void;
  isRRWeightsEnabled?: boolean;
  customClassNames?: CheckedTeamSelectWithEmailsCustomClassNames;
  groupId: string | null;
}) => {
  const isPlatform = useIsPlatform();
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [currentOption, setCurrentOption] = useState(value[0] ?? null);
  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();
  const valueFromGroup = groupId ? value.filter((host) => host.groupId === groupId) : value;

  const handleSelectChange = (newValue: readonly CheckedSelectOptionWithEmail[]) => {
    const otherGroupsHosts = getHostsFromOtherGroups(value, groupId);
    const newValueAllGroups = [...otherGroupsHosts, ...newValue.map((host) => ({ ...host, groupId }))];
    props.onChange(newValueAllGroups);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLInputElement;
    const inputValue = target.value?.trim();
    if (event.key === "Backspace" && !inputValue) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      if (!inputValue) {
        return;
      }

      // Parse comma-separated emails
      const emails = inputValue
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      const validEmails: CheckedSelectOptionWithEmail[] = [];
      const invalidEmails: string[] = [];

      emails.forEach((email) => {
        const emailValidation = emailSchema.safeParse(email);

        if (emailValidation.success) {
          const isDuplicate = valueFromGroup.some(
            (v) => v.email?.toLowerCase() === email.toLowerCase() || v.label === email
          );

          if (isDuplicate) {
            showToast(t("member_already_invited", { email }), "error");
          } else {
            validEmails.push({
              value: `email:${email}`,
              label: email,
              avatar: "",
              email: email,
              isEmailInvite: true,
              priority: 2,
              weight: 100,
              groupId: groupId,
              defaultScheduleId: null,
            });
          }
        } else {
          invalidEmails.push(email);
        }
      });

      if (invalidEmails.length > 0) {
        showToast(t("invalid_email_addresses", { emails: invalidEmails.join(", ") }), "error");
      }

      if (validEmails.length > 0) {
        const otherGroupsHosts = getHostsFromOtherGroups(value, groupId);
        const newValueAllGroups = [...otherGroupsHosts, ...valueFromGroup, ...validEmails];
        props.onChange(newValueAllGroups);
      }

      target.value = "";
    }
  };

  return (
    <>
      <Select
        {...props}
        name={props.name}
        placeholder={props.placeholder || t("add_members_or_emails")}
        isSearchable={true}
        options={options}
        value={valueFromGroup}
        onChange={handleSelectChange}
        isMulti
        isClearable={false}
        controlShouldRenderValue={false}
        className={customClassNames?.hostsSelect?.select}
        innerClassNames={{
          ...customClassNames?.hostsSelect?.innerClassNames,
          control: "rounded-md",
        }}
        onKeyDown={handleKeyDown}
        components={{
          MenuList: CustomMenuList,
        }}
      />
      <ul
        className={classNames(
          "mb-4 mt-3 rounded-md transition-all duration-200",
          valueFromGroup.length >= 1 && "border-subtle bg-default border shadow-sm",
          customClassNames?.selectedHostList?.container
        )}
        ref={animationRef}>
        {valueFromGroup.map((option, index) => (
          <li
            key={option.value}
            className={classNames(
              "hover:bg-subtle group flex px-3 py-2.5 transition-colors duration-150",
              index === valueFromGroup.length - 1 ? "" : "border-subtle border-b",
              customClassNames?.selectedHostList?.listItem?.container
            )}>
            {!isPlatform && !option.isEmailInvite && (
              <div className="transition-transform duration-200 group-hover:scale-105">
                <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
              </div>
            )}
            {!isPlatform && option.isEmailInvite && (
              <div className="bg-emphasis/10 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-105">
                <Icon name="mail" className="text-emphasis h-3 w-3" />
              </div>
            )}
            {isPlatform && (
              <Icon
                name={option.isEmailInvite ? "mail" : "user"}
                className={classNames(
                  "mt-0.5 h-4 w-4 transition-transform duration-200 group-hover:scale-105",
                  customClassNames?.selectedHostList?.listItem?.avatar
                )}
              />
            )}
            <p
              className={classNames(
                "text-emphasis my-auto ms-3 text-sm font-medium",
                customClassNames?.selectedHostList?.listItem?.name
              )}>
              {option.label}
              {option.isEmailInvite && (
                <span className="bg-subtle text-muted ml-2 rounded-full px-2 py-0.5 text-xs font-normal">
                  {t("pending_invite")}
                </span>
              )}
            </p>
            <div className="ml-auto flex items-center">
              {option && !option.isFixed && !option.isEmailInvite ? (
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
        ))}
      </ul>
      {currentOption && !currentOption.isFixed && !currentOption.isEmailInvite ? (
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

export default CheckedTeamSelectWithEmails;
