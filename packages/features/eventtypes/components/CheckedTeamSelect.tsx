"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState, useCallback } from "react";
import type { Options, Props } from "react-select";
import CreatableSelect from "react-select/creatable";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { getHostsFromOtherGroups } from "@calcom/lib/bookings/hostGroupUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { emailSchema } from "@calcom/lib/emailSchema";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { showToast } from "@calcom/ui/components/toast";

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

// Props for email invitation support
export type CheckedTeamSelectProps = Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  options?: Options<CheckedSelectOption>;
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
  isRRWeightsEnabled?: boolean;
  customClassNames?: CheckedTeamSelectCustomClassNames;
  groupId: string | null;
  // New props for email invitation
  allowEmailInvites?: boolean;
  teamId?: number;
  onEmailInvite?: (emails: string[]) => Promise<{ success: string[]; failed: string[] }>;
  isInviting?: boolean;
};
// Email validation helper
const isValidEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

// Parse pasted text for multiple emails
const parsePastedEmails = (text: string): string[] => {
  return text
    .split(/[,;\n\r\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0 && isValidEmail(email));
};

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  isRRWeightsEnabled,
  customClassNames,
  groupId,
  allowEmailInvites = false,
  teamId,
  onEmailInvite,
  isInviting = false,
  ...props
}: CheckedTeamSelectProps) => {
  const isPlatform = useIsPlatform();
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isProcessingEmails, setIsProcessingEmails] = useState(false);

  const [currentOption, setCurrentOption] = useState(value[0] ?? null);

  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  const valueFromGroup = groupId ? value.filter((host) => host.groupId === groupId) : value;

  const handleSelectChange = (newValue: readonly CheckedSelectOption[]) => {
    const otherGroupsHosts = getHostsFromOtherGroups(value, groupId);

    const newValueAllGroups = [...otherGroupsHosts, ...newValue.map((host) => ({ ...host, groupId }))];
    props.onChange(newValueAllGroups);
  };

  // Handle creating new option from email input
  const handleCreateOption = useCallback(
    async (inputValue: string) => {
      if (!allowEmailInvites || !onEmailInvite) return;

      const emails = parsePastedEmails(inputValue);
      if (emails.length === 0) {
        showToast(t("invalid_email_format"), "error");
        return;
      }

      // Check which emails are already in options (by checking if label matches email)
      const existingEmails = new Set(options.map((opt) => opt.label?.toLowerCase()).filter(Boolean));
      const newEmails = emails.filter((email) => !existingEmails.has(email));

      if (newEmails.length === 0) {
        showToast(t("emails_already_in_team"), "warning");
        return;
      }

      setIsProcessingEmails(true);
      try {
        const result = await onEmailInvite(newEmails);

        if (result.success.length > 0) {
          showToast(
            t("invited_n_members", { count: result.success.length }),
            "success"
          );
        }

        if (result.failed.length > 0) {
          showToast(
            t("failed_to_invite_n_members", { count: result.failed.length }),
            "error"
          );
        }
      } catch (error) {
        showToast(t("invitation_failed"), "error");
      } finally {
        setIsProcessingEmails(false);
        setInputValue("");
      }
    },
    [allowEmailInvites, onEmailInvite, options, t]
  );

  // Handle paste event for bulk email input
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (!allowEmailInvites) return;

      const pastedText = event.clipboardData.getData("text");
      const emails = parsePastedEmails(pastedText);

      // If we have multiple emails or a valid single email that's not in options, process it
      if (emails.length >= 1) {
        const existingEmails = new Set(options.map((opt) => opt.label?.toLowerCase()).filter(Boolean));
        const newEmails = emails.filter((email) => !existingEmails.has(email));

        if (newEmails.length > 0 && onEmailInvite) {
          event.preventDefault();
          setIsProcessingEmails(true);
          try {
            const result = await onEmailInvite(newEmails);

            if (result.success.length > 0) {
              showToast(
                t("invited_n_members", { count: result.success.length }),
                "success"
              );
            }

            if (result.failed.length > 0) {
              showToast(
                t("failed_to_invite_n_members", { count: result.failed.length }),
                "error"
              );
            }
          } catch (error) {
            showToast(t("invitation_failed"), "error");
          } finally {
            setIsProcessingEmails(false);
          }
        }
      }
    },
    [allowEmailInvites, onEmailInvite, options, t]
  );

  // Common select props
  const commonSelectProps = {
    ...props,
    name: props.name,
    placeholder: props.placeholder || t("select"),
    isSearchable: true,
    options,
    value: valueFromGroup,
    onChange: handleSelectChange,
    isMulti: true,
    isDisabled: isInviting || isProcessingEmails,
    isLoading: isInviting || isProcessingEmails,
    className: customClassNames?.hostsSelect?.select,
  };

  return (
    <>
      {allowEmailInvites ? (
        <CreatableSelect
          {...commonSelectProps}
          inputValue={inputValue}
          onInputChange={(newValue: string) => setInputValue(newValue)}
          onCreateOption={handleCreateOption}
          onPaste={handlePaste}
          formatCreateLabel={(inputValue: string) =>
            isValidEmail(inputValue)
              ? t("invite_email_address", { email: inputValue })
              : t("enter_valid_email")
          }
          isValidNewOption={(inputValue: string) => isValidEmail(inputValue)}
          className={customClassNames?.hostsSelect?.select}
        />
      ) : (
        <Select
          {...commonSelectProps}
          className={customClassNames?.hostsSelect?.select}
          innerClassNames={{
            ...customClassNames?.hostsSelect?.innerClassNames,
            control: "rounded-md",
          }}
        />
      )}
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
