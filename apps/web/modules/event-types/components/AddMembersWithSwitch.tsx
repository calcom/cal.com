"use client";

import AssignAllTeamMembers from "@calcom/features/eventtypes/components/AssignAllTeamMembers";
import type {
  CheckedSelectOption,
  CheckedTeamSelectCustomClassNames,
} from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import CheckedTeamSelect from "@calcom/features/eventtypes/components/CheckedTeamSelect";
import type {
  FormValues,
  Host,
  SettingsToggleClassNames,
  TeamMember,
} from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label } from "@calcom/ui/components/form";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { Options } from "react-select";

interface IUserToValue {
  id: number | null;
  name: string | null;
  username: string | null;
  avatar: string;
  email: string;
  defaultScheduleId: number | null;
}

export const mapUserToValue = (
  { id, name, username, avatar, email, defaultScheduleId }: IUserToValue,
  pendingString: string
) => ({
  value: `${id || ""}`,
  label: `${name || email || ""}${!username ? ` (${pendingString})` : ""}`,
  avatar,
  email,
  defaultScheduleId,
});

const sortByLabel = (a: ReturnType<typeof mapUserToValue>, b: ReturnType<typeof mapUserToValue>) => {
  if (a.label < b.label) return -1;
  if (a.label > b.label) return 1;
  return 0;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const CheckedHostField = ({
  labelText,
  placeholder,
  options = [],
  isFixed,
  value,
  onChange,
  isRRWeightsEnabled,
  groupId,
  customClassNames,
  ...rest
}: {
  labelText?: string;
  placeholder: string;
  isFixed: boolean;
  value: Host[];
  onChange?: (options: Host[]) => void;
  options?: Options<CheckedSelectOption>;
  isRRWeightsEnabled?: boolean;
  groupId: string | null;
} & Omit<Partial<ComponentProps<typeof CheckedTeamSelect>>, "onChange" | "value">) => {
  const { t } = useLocale();

  return (
    <div className="flex flex-col rounded-md">
      <div>
        {labelText ? <Label>{labelText}</Label> : <></>}
        <CheckedTeamSelect
          isOptionDisabled={(option) => {
            const userId = parseInt(option.value, 10);
            if (Number.isNaN(userId)) {
              // It's an email entry - check by email
              return !!value.find((host) => host.email === option.value);
            }
            return !!value.find((host) => host.userId === userId);
          }}
          onChange={(options) => {
            onChange?.(
              options.map((option) => {
                const userId = parseInt(option.value, 10);
                const isEmail = Number.isNaN(userId);
                return {
                  isFixed,
                  userId: isEmail ? 0 : userId,
                  email: isEmail ? option.value : undefined,
                  priority: option.priority ?? 2,
                  weight: option.weight ?? 100,
                  scheduleId: option.defaultScheduleId ?? null,
                  groupId: option.groupId,
                };
              })
            );
          }}
          value={(value || [])
            .filter(({ isFixed: _isFixed }) => isFixed === _isFixed)
            .reduce((acc, host) => {
              const option = options.find((member) => member.value === host.userId.toString());

              if (option) {
                acc.push({
                  ...option,
                  priority: host.priority ?? 2,
                  isFixed,
                  weight: host.weight ?? 100,
                  groupId: host.groupId,
                });
                return acc;
              }

              // Handle email-based pending invite entries
              if (host.userId === 0 && host.email) {
                acc.push({
                  label: `${host.email} (${t("invite")})`,
                  value: host.email,
                  avatar: "",
                  priority: host.priority ?? 2,
                  isFixed,
                  weight: host.weight ?? 100,
                  groupId: host.groupId,
                });
              }

              return acc;
            }, [] as CheckedSelectOption[])}
          controlShouldRenderValue={false}
          options={options}
          placeholder={placeholder}
          isRRWeightsEnabled={isRRWeightsEnabled}
          customClassNames={customClassNames}
          groupId={groupId}
          isCreatable={true}
          isValidNewOption={(inputValue) => {
            const parts = inputValue
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            return parts.length > 0 && parts.every((part) => isValidEmail(part));
          }}
          formatCreateLabel={(inputValue) => `${t("invite")} ${inputValue}`}
          {...rest}
        />
      </div>
    </div>
  );
};

export type AddMembersWithSwitchCustomClassNames = {
  assingAllTeamMembers?: SettingsToggleClassNames;
  teamMemberSelect?: CheckedTeamSelectCustomClassNames;
};

export type AddMembersWithSwitchProps = {
  teamMembers: TeamMember[];
  value: Host[];
  onChange: (hosts: Host[]) => void;
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  automaticAddAllEnabled: boolean;
  onActive: () => void;
  isFixed: boolean;
  placeholder?: string;
  isRRWeightsEnabled?: boolean;
  teamId: number;
  isSegmentApplicable?: boolean;
  groupId: string | null;
  "data-testid"?: string;
  containerClassName?: string;
  customClassNames?: AddMembersWithSwitchCustomClassNames;
};

export function AddMembersWithSwitch({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  automaticAddAllEnabled,
  onActive,
  isFixed,
  placeholder = "",
  isRRWeightsEnabled,
  groupId,
  customClassNames,
  ...rest
}: AddMembersWithSwitchProps) {
  const { t } = useLocale();

  return (
    <>
      <div className="mb-2">
        {automaticAddAllEnabled && !groupId && (
          <Controller<FormValues>
            name="assignAllTeamMembers"
            render={() => (
              <AssignAllTeamMembers
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
                onActive={onActive}
                customClassNames={customClassNames?.assingAllTeamMembers}
              />
            )}
          />
        )}
      </div>
      {!assignAllTeamMembers && (
        <div className="mb-2">
          <CheckedHostField
            data-testid={rest["data-testid"]}
            value={value}
            onChange={onChange}
            isFixed={isFixed}
            className="mb-2"
            options={teamMembers
              .map((member) => ({
                ...member,
                groupId: groupId,
              }))
              .sort(sortByLabel)}
            placeholder={placeholder ?? t("add_attendees")}
            isRRWeightsEnabled={isRRWeightsEnabled}
            groupId={groupId}
            customClassNames={customClassNames?.teamMemberSelect}
          />
        </div>
      )}
    </>
  );
}

export default AddMembersWithSwitch;
