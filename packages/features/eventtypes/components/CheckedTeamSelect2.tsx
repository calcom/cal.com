"use client";
"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import * as React from "react";
import type { Props, GroupBase, ClassNamesConfig } from "react-select";
import CreatableSelect from "react-select/creatable";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

// Email validation utilities
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const isValidEmail = (val: string) => EMAIL_RE.test(val.trim());
const parseEmails = (input: string) =>
  input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export interface CheckedSelectOption {
  avatar?: string;
  label: string;
  value: string;
  priority?: number;
  weight?: number;
  isFixed?: boolean;
  disabled?: boolean;
  defaultScheduleId?: number | null;
  isPending?: boolean;
  profileId?: number;
  groupId?: string | null;
}

export interface CheckedTeamSelectCustomClassNames {
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
}

interface CheckedTeamSelectProps extends Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> {
  options?: CheckedSelectOption[];
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
  isRRWeightsEnabled?: boolean;
  customClassNames?: CheckedTeamSelectCustomClassNames;
  groupId: string | null;
}

export const CheckedTeamSelect = ({
  options = [],
  value = [],
  isRRWeightsEnabled,
  customClassNames,
  groupId,
  ...props
}: CheckedTeamSelectProps) => {
  const isPlatform = useIsPlatform();
  const { t } = useLocale();
  const [animationRef] = useAutoAnimate<HTMLUListElement>();

  // State for dialog management - will be used in the next PR
  // const [priorityDialogOpen, setPriorityDialogOpen] = useState<boolean>(false);
  // const [weightDialogOpen, setWeightDialogOpen] = useState<boolean>(false);
  // const [currentOption, setCurrentOption] = useState<CheckedSelectOption | null>(null);

  const valueFromGroup = groupId ? value.filter((host) => host.groupId === groupId) : value;

  function getPriorityTextAndColor(priority?: number) {
    switch (priority) {
      case 0:
        return { text: t("low"), color: "text-gray-500" };
      case 1:
        return { text: t("medium"), color: "text-blue-500" };
      case 2:
        return { text: t("high"), color: "text-red-500" };
      default:
        return { text: t("normal"), color: "text-black" };
    }
  }

  return (
    <>
      <CreatableSelect<CheckedSelectOption, true, GroupBase<CheckedSelectOption>>
        {...props}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isMulti
        isSearchable
        options={options}
        value={value}
        className={customClassNames?.hostsSelect?.select}
        classNames={
          customClassNames?.hostsSelect?.innerClassNames as ClassNamesConfig<
            CheckedSelectOption,
            true,
            GroupBase<CheckedSelectOption>
          >
        }
        onChange={(newVal) => props.onChange(newVal)}
        onCreateOption={(inputValue) => {
          const emails = parseEmails(inputValue);
          const validEmails = emails.filter(isValidEmail);
          if (validEmails.length > 0) {
            const newOptions = validEmails.map((email) => ({
              value: email,
              label: `${email} (invite pending)`,
              avatar: "",
              isPending: true,
              groupId: groupId ?? null,
            }));
            props.onChange([...(value || []), ...newOptions]);
          } else {
            showToast(t("please_enter_valid_email"), "error");
          }
        }}
      />

      <ul
        className={classNames(
          "mb-4 mt-3 rounded-md",
          valueFromGroup.length >= 1 && "border-subtle border",
          customClassNames?.selectedHostList?.container
        )}
        ref={animationRef}>
        {valueFromGroup.map((option, index) => (
          <li
            key={option.value}
            className={classNames(
              `flex px-3 py-2 ${index === valueFromGroup.length - 1 ? "" : "border-subtle border-b"}`,
              customClassNames?.selectedHostList?.listItem?.container
            )}>
            {!isPlatform && option.avatar ? (
              <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />
            ) : (
              <Icon
                name="user"
                className={classNames("mt-0.5 h-4 w-4", customClassNames?.selectedHostList?.listItem?.avatar)}
              />
            )}

            <p
              className={classNames(
                "text-emphasis my-auto ms-3 text-base",
                customClassNames?.selectedHostList?.listItem?.name
              )}>
              {option.label}
            </p>

            <div className="ml-auto flex items-center">
              {!option.isPending && !option.isFixed && (
                <>
                  <Tooltip content={t("change_priority")}>
                    <Button
                      color="minimal"
                      className={classNames(
                        "mr-6 h-2 p-0 text-base opacity-100 hover:opacity-75",
                        getPriorityTextAndColor(option.priority).color,
                        customClassNames?.selectedHostList?.listItem?.changePriorityButton
                      )}
                      onClick={() => {
                        // TODO: Add dialog management in next PR
                        // setCurrentOption(option);
                        // setPriorityDialogOpen(true);
                      }}>
                      {t(getPriorityTextAndColor(option.priority).text)}
                    </Button>
                  </Tooltip>

                  {isRRWeightsEnabled ? (
                    <Button
                      color="minimal"
                      className={classNames(
                        "mr-6 h-2 w-4 p-0 text-base opacity-100 hover:opacity-75",
                        customClassNames?.selectedHostList?.listItem?.changeWeightButton
                      )}
                      onClick={() => {
                        // TODO: Add dialog management in next PR
                        // setCurrentOption(option);
                        // setWeightDialogOpen(true);
                      }}>
                      {option.weight ?? 100}%
                    </Button>
                  ) : null}
                </>
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
    </>
  );
};
